"""
Migration script for running migration recipes.

Requires the mozilla fluent.migrate package (available with pip).

NOTE: This will likely send queries to the weblate API as part of the run.
Weblate may have a query limit of 100 requests per day for unauthorised users.


Based on the firefox migration script, adapted for tor browser. See
https://firefox-source-docs.mozilla.org/l10n/migrations/ for more context and
information on how to write the migration recipes.


Usage with an example:

We have some en-US file "updated.ftl" in the tor-browser repository that we have
added new strings to. Some of these strings are copies or concatenations of some
already existing strings in a `.dtd`, `.properties` or `.ftl` file (including
strings within "updated.ftl").

So we also write a migration recipe in
`./l10n_migrations/bug-xxxx-my-migration-recipe.py`
which includes a `migrate(ctx)` method. This method takes the old strings and
create new Messages or Terms for "updated.ftl" using `ctx.add_transforms`. These
should match what was already done manually in "updated.ftl".

Then we copy the en-US file to our local translation repository, say at
`/home/user/translation/en-US/updated.ftl`. The en-US file is needed as a
reference during migration to know where in the new file the new Messages or
Terms should be placed. Moreover, the migration can be verified against the
en-US file to ensure it is working as intended.

Then we run the migration for individual locales:

```
    python migrate_l10n.py --translation-git /home/user/translation --locales 'es-ES sr' l10n_migrations.bug-xxxx-my-migration-recipe
```

This will first run a mock migration using the en-US localization files. This is
to help ensure that the migration will work as intended. I.e. if we ran the
migration recipe for en-US, using it as both the source of old strings and as a
reference, then each transformation using these old strings should produce a
Message or Term that is identical to the one in the reference file.

Then this will run `migrate(ctx)` for the es-ES and sr locales. Some of the
transformations will not be completed for a locale if that locale does not
contain a translated version of the old strings the transformation requires
(because there is no string to copy).

If one of the old strings is from a `.dtd` or `.properties` file, this will
check whether they are marked as translated on weblate using its API. This
prevents copying "placeholder" en-US values into the locale's fluent files.

Any warnings or errors will be logged to stderr in the console.
"""

import argparse
import atexit
import importlib
import json
import logging
import os
import sys
import urllib.request

from fluent.migrate.context import MigrationContext
from fluent.migrate.errors import EmptyLocalizationError, UnreadableReferenceError
from fluent.syntax import ast, parse, serialize


def in_red(string):
    """
    Wrap a string so that it is shown as red in the console.
    """
    return f"\x1b[1;91m{string}\x1b[0m"


class WeblateMetadata:
    """
    Manages and fetches string metadata from weblate.
    """

    def __init__(self):
        self.logger = logging.getLogger("weblate-metadata")
        self.logger.setLevel(logging.INFO)

        # The _components property will be lazy-loaded with weblate data.
        #
        # On weblate, for monolingual formats, the component will have a
        # "template" file, which matches the en-US file path in the
        # "translation" git repo. So we can find a component through a matching
        # template.
        #
        # Each translation in that component will have a "filename" that will
        # match the locale's file path in the "translation" git repo. So we can
        # find a translation through a matching filename.
        #
        # Each translation can be queried for its units, including metadata.
        # Each unit's "context" will match the string's id in the corresponding
        # file.
        #
        # Expect the final structure to be:
        # {
        #   template: {
        #     "translations-url": str,     # Used for API translations query.
        #     "translations": {
        #        filename: {
        #          "units-url": str,       # Used for API units query.
        #          "units": {
        #            context: {
        #              "translated": bool,
        #            },
        #          },
        #        },
        #     },
        #   },
        # }
        self._components = None

    def _get_weblate_response(self, url):
        weblate_request = urllib.request.Request(
            url,
            # NOTE: can set the request header:
            # "Authorization": "Token WEBLATE_TOKEN"
            # to get around rate-limiting
            headers={"User-Agent": ""},
        )

        with urllib.request.urlopen(weblate_request, timeout=20) as response:
            return json.load(response)

    def _get_from_weblate(self, url):
        ret = []
        while url:
            response = self._get_weblate_response(url)
            # Continue to fetch the next page, if it is present.
            # Expect the "next" url to be empty
            # or the same url with "?page=2", etc.
            url = response["next"]
            ret.extend(response["results"])
        return ret

    def _get_components(self):
        if self._components is None:
            self._components = {
                comp["template"]: {
                    "translations": None,
                    "translations-url": comp["translations_url"],
                }
                for comp in self._get_from_weblate(
                    "https://hosted.weblate.org/api/projects/tor/components/"
                )
                if comp["template"]
            }
        return self._components

    def _get_translations(self, template):
        component = self._get_components().get(template, None)
        if not component:
            self.logger.warning(f"No component in weblate for {template}.")
            return None
        if component["translations"] is None:
            component["translations"] = {
                trans["filename"]: {
                    "units": None,
                    "units-url": trans["units_list_url"],
                }
                for trans in self._get_from_weblate(component["translations-url"])
            }
        return component["translations"]

    def _get_units(self, template, file):
        translation_dict = self._get_translations(template)
        if translation_dict is None:
            return None
        translation = translation_dict.get(file, None)
        if translation is None:
            self.logger.warning(f"No translation in weblate for {file}.")
            return None
        if translation["units"] is None:
            translation["units"] = {
                unit["context"]: {
                    "translated": unit["translated"],
                }
                for unit in self._get_from_weblate(translation["units-url"])
            }
        return translation["units"]

    def is_translated(self, template_path, locale_path, string_id):
        """
        Whether the given string is marked as translated on weblate.
        """
        unit_dict = self._get_units(template_path, locale_path)
        if unit_dict is None:
            return False
        unit = unit_dict.get(string_id, None)
        if unit is None:
            self.logger.warning(f"No unit in weblate for {locale_path}:{string_id}.")
            return False
        return unit["translated"]


class TorBrowserMigrationContext(MigrationContext):
    """
    Extension which adds some extra methods to use for tor-browser.
    """

    def __init__(self, locale, reference_dir, localization_dir):
        super().__init__(locale, reference_dir, localization_dir)

    def _fluent_keys(self, resource):
        # ast.Resource, want to extract all Message and Term identifiers, as
        # well as their
        for entry in resource.body:
            if not isinstance(entry, (ast.Term, ast.Message)):
                continue
            key = entry.id.name
            if isinstance(entry, ast.Term):
                key = f"-{key}"
            if entry.value:
                yield key
            for attr in entry.attributes:
                yield f"{key}.{attr.id.name}"

    def tb_get_available_strings(self):
        """
        Return all the (path, string_id) pairs for all loaded localization
        resources.
        """
        all_strings = set()
        # ctx.localization_resources is a dict containing all the loaded
        # localization_resources that have been added during add_transforms.
        # { localization_path: resource }
        for path, resource in self.localization_resources.items():
            if path.endswith(".ftl"):
                all_strings.update((path, key) for key in self._fluent_keys(resource))
            else:
                # dictionary of { identifies: value } in legacy resource.
                # For tor-browser,
                # Only include references that differ from the en-US strings.
                all_strings.update((path, key) for key in resource.keys())
        return all_strings

    def tb_get_missing_resources(self):
        """
        Return the missing localization resources.
        """
        return set(
            path
            for dep_set in self.dependencies.values()
            for path, string_id in dep_set
            if path not in self.localization_resources
        )

    def tb_get_transform(self, target_path, transform_id):
        """
        Find the transformation node with the given id for the given path.
        """
        for node in self.transforms[target_path]:
            if node.id.name == transform_id:
                return node
        return None

    def tb_get_reference_entry(self, target_path, entry_id):
        """
        Find the reference node that would be used for the given id and path.
        """
        for entry in self.reference_resources[target_path].body:
            if isinstance(entry, (ast.Term, ast.Message)) and entry.id.name == entry_id:
                return entry.clone()
        return None


class TorBrowserMigrator:
    """
    Performs a tor-browser migration.
    """

    def __init__(
        self,
        en_US_dir,
        locale_dirs,
        migrate_module,
        weblate_metadata,
    ):
        self.logger = logging.getLogger("tor-browser-migrator")
        self.logger.setLevel(logging.INFO)
        self.en_US_dir = en_US_dir
        self.locale_dirs = locale_dirs
        self.migrate_module = migrate_module
        self.weblate_metadata = weblate_metadata

    def run(self):
        """
        Run the migration.
        """
        if not self._check_en_US_resources():
            sys.exit(1)

        fluent_errors = []
        for locale, locale_dir in self.locale_dirs.items():
            if locale == "en-US":
                print("", file=sys.stderr)
                self.logger.warning(
                    "Skipping running migration on 'en-US' files since this "
                    "locale should act as a reference only.\n"
                )
                continue
            fluent_errors.extend(self._run_locale(locale, locale_dir))

        if fluent_errors:
            print("\n", file=sys.stderr)
            self.logger.error(
                "Fluent parsing errors found for the following files. "
                "Migration does not need to be run again, but the following "
                "syntax errors should be fixed manually.\n"
                + "\n".join(
                    f"{in_red(full_path)}: line {line}: {message}: [[{sample}]]"
                    for full_path, message, line, sample in fluent_errors
                )
            )

    def _run_locale(self, locale, locale_dir):
        print("\n\n", file=sys.stderr)
        self.logger.info(f"Migrating '{in_red(locale)}' locale\n")

        ctx = self._get_migration_context(locale, locale_dir)

        # NOTE: We do not use the existing ctx.serialize_changeset method.
        # The problem with this approach was that it would re-shuffle the order
        # of already existing strings to match the en-US locale.
        # But Weblate currently does not preserve the order of translated
        # strings: https://github.com/WeblateOrg/weblate/issues/11134
        # so this created extra noise in the diff.
        # Instead, we just always append transformations to the end of the
        # existing file.
        # Moreover, it would inject group comments into the translated files,
        # which Weblate does not handle well. Instead, we just do not add any
        # comments.
        #
        # In case we want to use it again in the future, here is a reference
        # to how it works:
        #
        # ctx.serialize_changeset expects a set of (path, identifier) of
        # localization resources that can be used to evaluate the
        # transformations.
        # e.g. ("example.dtd", "exampleStringInDTD")
        #      ("example.ftl", "some-message")
        #      ("example.ftl", "some-message.attribute")
        #
        # Mozilla splits its changesets into the authors/users who are
        # attributed to creating the identified sources, using hg blame and
        # checking the author to identify the user.
        # For tor-browser, we just want to apply all the changes possible in
        # one step, so we want to fill the changeset with all required
        # (path, identifier) pairs found in the localization resources.

        available_strings = ctx.tb_get_available_strings()
        wrote_file = False
        errors = []

        for target_path, reference in ctx.reference_resources.items():
            translated_ids = [
                entry.id.name
                for entry in ctx.target_resources[target_path].body
                if isinstance(entry, (ast.Message, ast.Term))
                # NOTE: We're assuming that the Message and Term ids do not
                # conflict with each other.
            ]
            new_entries = []

            # Apply transfomations in the order they appear in the reference
            # (en-US) file.
            for entry in reference.body:
                if not isinstance(entry, (ast.Message, ast.Term)):
                    continue
                transform_id = entry.id.name
                transform = ctx.tb_get_transform(target_path, transform_id)
                if not transform:
                    # No transformation for this reference entry.
                    continue

                if transform_id in translated_ids:
                    self.logger.info(
                        f"Skipping transform {target_path}:{transform_id} "
                        f"for '{locale}' locale because it already has a "
                        f"translation."
                    )
                    continue

                # ctx.dependencies is a dict of dependencies for all
                # transformations
                # { (target_path, transform_identifier): set(
                #     (localization_path, string_identifier),
                # )}
                #
                # e.g. if we want to create a new fluent Message called
                # "new-string1", and it uses "oldString1" from "old-file1.dtd"
                # and "oldString2" from "old-file2.dtd". And "new-string2" using
                # "oldString3" from "old-file2.dtd", it would be
                # {
                #   ("new-file.ftl", "new-string1"): set(
                #     ("old-file1.dtd", "oldString1"),
                #     ("old-file2.dtd", "oldString2"),
                #   ),
                #   ("new-file.ftl", "new-string2"): set(
                #     ("old-file2.dtd", "oldString3"),
                #   ),
                # }
                dep_set = ctx.dependencies[(target_path, transform_id)]
                can_transform = True
                for dep in dep_set:
                    path, string_id = dep
                    if dep not in available_strings:
                        can_transform = False
                        self.logger.info(
                            f"Skipping transform {target_path}:{transform_id} "
                            f"for '{locale}' locale because it is missing the "
                            f"string {path}:{string_id}."
                        )
                        break
                    # Strings in legacy formats might have an entry in the file
                    # that is just a copy of the en-US strings.
                    # For these we want to check the weblate metadata to ensure
                    # it is a translated string.
                    if not path.endswith(
                        ".ftl"
                    ) and not self.weblate_metadata.is_translated(
                        os.path.join("en-US", path),
                        os.path.join(locale, path),
                        string_id,
                    ):
                        can_transform = False
                        self.logger.info(
                            f"Skipping transform {target_path}:{transform_id} "
                            f"for '{locale}' locale because the string "
                            f"{path}:{string_id} has not been translated on "
                            "weblate."
                        )
                        break
                if not can_transform:
                    continue

                # Run the transformation.
                new_entries.append(ctx.evaluate(transform))

            if not new_entries:
                continue

            full_path = os.path.join(locale_dir, target_path)
            print("", file=sys.stderr)
            self.logger.info(f"Writing to {full_path}")

            # For Fluent we can just serialize the transformations and append
            # them to the end of the existing file.
            resource = ast.Resource(new_entries)
            with open(full_path, "a") as file:
                file.write(serialize(resource))

            with open(full_path, "r") as file:
                full_content = file.read()
            wrote_file = True
            # Collect any fluent parsing errors from the newly written file.
            errors.extend(
                (full_path, message, line, sample)
                for message, line, sample in self._fluent_errors(full_content)
            )

        if not wrote_file:
            self.logger.info(f"No files written for '{locale}' locale.")
        return errors

    def _fluent_errors(self, fluent):
        """
        Verify that the given fluent string can be parsed correctly.
        """
        resource = parse(fluent)
        for entry in resource.body:
            if not isinstance(entry, ast.Junk):
                continue
            for annotation in entry.annotations:
                line = fluent[0 : annotation.span.start].count("\n") + 1
                sample_start = max(annotation.span.start - 15, 0)
                sample = "…" + fluent[sample_start : sample_start + 30] + "…"
                yield annotation.message, line, sample

    def _get_migration_context(self, locale, locale_dir):
        prev_missing_resources = set()
        while True:
            ctx = TorBrowserMigrationContext(locale, self.en_US_dir, locale_dir)

            try:
                self.migrate_module.migrate(ctx)
            except EmptyLocalizationError:
                # This case will be handled by missing_resources below.
                # NOTE: At the time of writing, add_transforms only throws if
                # ctx.localization_resources is empty after add_transforms,
                # which means whether it throws can depend on whether the
                # missing resource was found missing before or after some
                # non-missing resource was found. I.e. the order in which
                # add_transforms is called can influence whether add_transforms
                # will throw.
                # Therefore, we want to handle the case where it throws or does
                # not throw in the same way. We also need to create a new
                # context for the next run so that the early exit from
                # add_transforms in this run does not make a difference.
                pass

            missing_resources = ctx.tb_get_missing_resources()

            if not missing_resources:
                return ctx

            still_missing = missing_resources & prev_missing_resources
            if still_missing:
                # Unexpected to still be missing the same files after the
                # previous run.
                self.logger.error(
                    f"Still missing files in '{locale}' locale: "
                    + ", ".join(in_red(path) for path in still_missing)
                )
                sys.exit(1)

            for path in missing_resources:
                # Create an empty file to try and get migrate() to succeed
                # the next round.
                # NOTE: Missing strings within a resource is ok, we just want to
                # add the missing file to prevent add_transforms from throwing
                # to allow us to proceed.
                full_path = os.path.join(locale_dir, path)
                self.logger.info(f"Creating temporary empty file: {full_path}")
                # Throw if it already exists.
                file = open(full_path, "x")
                # Remove the empty file on exit if it is still empty.
                atexit.register(self._remove_if_empty, full_path)
                # Immediately close.
                file.close()

            # Try again with the newly added resources.
            # Don't expect it to throw EmptyLocalizationError the second time,
            # although it may still be missing resources if the last run threw
            # before localization_resources was fully populated.
            prev_missing_resources = missing_resources

    def _remove_if_empty(self, path):
        if os.stat(path).st_size:
            self.logger.warning(f"{path} is no longer empty. Not deleting.")
            return
        os.remove(path)

    def _check_en_US_resources(self):
        # We pass in the en-US directory as the localization directory, as well
        # as the reference directory.
        ctx = TorBrowserMigrationContext("en-US", self.en_US_dir, self.en_US_dir)

        have_error = False
        try:
            self.migrate_module.migrate(ctx)
        except EmptyLocalizationError:
            # Handle with localization_resources check.
            # NOTE: This throwing may have prevented further add_transforms from
            # proceeding, so we will only report missing string errors up to
            # this point.
            # Set have_error here just in case.
            have_error = True
        except UnreadableReferenceError:
            # Reference filename is printed before this.
            self.logger.error("Missing an en-US reference file.")
            return False

        # Check each transform would create the same entry in the target as the
        # already existing reference file for en-US, using the existing en-US
        # localization files.
        # I.e. if we ran the transforms for en-US we expect to get the same file
        # as the reference.
        available_strings = ctx.tb_get_available_strings()
        for (target_path, transform_id), dep_set in ctx.dependencies.items():
            transform_name = in_red(f"{target_path}:{transform_id}")
            has_deps = True
            for dep in dep_set:
                path, string_id = dep
                if path not in ctx.localization_resources:
                    has_deps = False
                    self.logger.error(
                        f"Missing en-US localization file {in_red(path)} "
                        f" for transform {transform_name}"
                    )
                    continue
                if dep not in available_strings:
                    has_deps = False
                    self.logger.error(
                        "Missing en-US localization string "
                        + in_red(f"{path}:{string_id}")
                        + f" for transform {transform_name}"
                    )
            if not has_deps:
                have_error = True
                continue

            transformed = ctx.evaluate(ctx.tb_get_transform(target_path, transform_id))
            reference_entry = ctx.tb_get_reference_entry(target_path, transform_id)
            if reference_entry is None:
                self.logger.error(
                    f"Missing en-US reference entry for transform {transform_name}"
                )
                have_error = True
                continue

            # Serialized the single transformed and reference and compare.
            transform_serialized = serialize(ast.Resource([transformed]))
            # Remove comment in reference for comparison.
            reference_entry.comment = None
            ref_serialized = serialize(ast.Resource([reference_entry]))
            if transform_serialized != ref_serialized:
                self.logger.error(
                    f"Transform {transform_name} would not produce the same "
                    "entry as the existing en-US reference when acting on "
                    "en-US localization files.\n"
                    f"Transform result:\n{transform_serialized}\n"
                    f"Reference entry:\n{ref_serialized}"
                )
                have_error = True

        return not have_error


parser = argparse.ArgumentParser(
    description="Run a tor-browser localization migration. "
    "See documentation within migrate_l10n.py."
)
parser.add_argument(
    "--translation-git",
    required=True,
    metavar="<dir>",
    help="Location of the translation-git directory to read and write to.",
)
parser.add_argument(
    "--locales",
    required=True,
    metavar="<locale1> <locale2> ...",
    help="Set of locales to restrict the migration to, separated by space.",
)
parser.add_argument(
    "migration",
    help="Migration to run, given as a python module. "
    'E.g. "l10n_migrations.my-migration-script".',
)


parsed_args = parser.parse_args()


def check_dir(path):
    if not os.path.isdir(path):
        print(f"{in_red(path)} is not a directory.", file=sys.stderr)
        sys.exit(1)
    return path


translation_dir = check_dir(os.path.abspath(parsed_args.translation_git))

TorBrowserMigrator(
    check_dir(os.path.join(translation_dir, "en-US")),
    {
        locale: check_dir(os.path.join(translation_dir, locale))
        for locale in (l.strip() for l in parsed_args.locales.split(" "))
        if locale
    },
    importlib.import_module(parsed_args.migration),
    WeblateMetadata(),
).run()
