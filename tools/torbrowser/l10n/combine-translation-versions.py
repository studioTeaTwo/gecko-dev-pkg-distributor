import argparse
import json
import logging
import os
import re
import subprocess

from combine import combine_files

arg_parser = argparse.ArgumentParser(
    description="Combine a translation file across two different versions"
)

arg_parser.add_argument(
    "current_branch", metavar="<current-branch>", help="branch for the newest version"
)
arg_parser.add_argument(
    "filenames", metavar="<filenames>", help="name of the translation files"
)
arg_parser.add_argument("outname", metavar="<json>", help="name of the json output")

args = arg_parser.parse_args()

logging.basicConfig()
logger = logging.getLogger("combine-translation-versions")
logger.setLevel(logging.INFO)


def in_pink(msg: str) -> str:
    """Present a message as pink in the terminal output.

    :param msg: The message to wrap in pink.
    :returns: The message to print to terminal.
    """
    # Pink and bold.
    return f"\x1b[1;38;5;212m{msg}\x1b[0m"


def git_run(git_args: list[str]) -> None:
    """Run a git command.

    :param git_args: The arguments that should follow "git".
    """
    # Add some text to give context to git's stderr appearing in log.
    logger.info("Running: " + in_pink("git " + " ".join(git_args)))
    subprocess.run(["git", *git_args], check=True)


def git_text(git_args: list[str]) -> str:
    """Get the text output for a git command.

    :param git_args: The arguments that should follow "git".
    :returns: The stdout of the command.
    """
    logger.info("Running: " + in_pink("git " + " ".join(git_args)))
    return subprocess.run(
        ["git", *git_args], text=True, check=True, stdout=subprocess.PIPE
    ).stdout


def git_lines(git_args: list[str]) -> list[str]:
    """Get the lines from a git command.

    :param git_args: The arguments that should follow "git".
    :returns: The non-empty lines from stdout of the command.
    """
    return [line for line in git_text(git_args).split("\n") if line]


def git_file_paths(git_ref: str) -> list[str]:
    """Get the full list of file paths found under the given tree.

    :param git_ref: The git reference for the tree to search.
    :returns: The found file paths.
    """
    return git_lines(["ls-tree", "-r", "--format=%(path)", git_ref])


def matching_path(search_paths: list[str], filename: str) -> str | None:
    """Get the matching file path with the given filename, if it exists.

    :param search_paths: The file paths to search through.
    :param filename: The file name to match.
    :returns: The unique file path with the matching name, or None if no such
      match was found.
    :throws Exception: If multiple paths shared the same file name.
    """
    matching = [path for path in search_paths if os.path.basename(path) == filename]
    if not matching:
        return None
    if len(matching) > 1:
        raise Exception("Multiple occurrences of {filename}")
    return matching[0]


def git_file_content(git_ref: str, path: str | None) -> str | None:
    """Get the file content of the specified git blob object.

    :param git_ref: The reference for the tree to find the file under.
    :param path: The file path for the object, or None if there is no path.
    :returns: The file content, or None if no path was given.
    """
    if path is None:
        return None
    return git_text(["cat-file", "blob", f"{git_ref}:{path}"])


def get_stable_branch(branch_prefix: str) -> str:
    """Find the most recent stable branch in the origin repository.

    :param branch_prefix: The prefix that the stable branch should have.
    :returns: The branch name.
    """
    tag_glob = f"{branch_prefix}-*-build1"
    # To speed up, only fetch the tags without blobs.
    git_run(
        ["fetch", "--depth=1", "--filter=object:type=tag", "origin", "tag", tag_glob]
    )
    # Get most recent stable tag.
    for build_tag, annotation in (
        line.split(" ", 1)
        for line in git_lines(["tag", "-n1", "--list", tag_glob, "--sort=-taggerdate"])
    ):
        if "stable" in annotation:
            # Branch name is the same as the tag, minus "-build1".
            return re.sub(r"-build1$", "", build_tag)
    raise Exception("No stable build1 tag found")


def get_version_from_branch_name(branch_name: str) -> tuple[str, float]:
    """Get the branch prefix and version from its name.

    :param branch_name: The branch to extract from.
    :returns: The branch prefix and its version number.
    """
    version_match = re.match(
        r"([a-z-]+)-[^-]*-([0-9]+\.[05])-",
        branch_name,
    )

    if not version_match:
        raise ValueError(f"Unable to parse the version from the branch {branch_name}")

    return (version_match.group(1), float(version_match.group(2)))


branch_prefix, current_version = get_version_from_branch_name(args.current_branch)

stable_branch = get_stable_branch(branch_prefix)
_, stable_version = get_version_from_branch_name(stable_branch)

if stable_version > current_version or stable_version < current_version - 0.5:
    raise Exception(
        f"Version of stable branch {stable_branch} is not within 0.5 of the "
        f"current branch {args.current_branch}"
    )

# Minimal fetch of stable_branch.
# Individual file blobs will be downloaded as needed.
git_run(["fetch", "--depth=1", "--filter=blob:none", "origin", stable_branch])

current_file_paths = git_file_paths("HEAD")
old_file_paths = git_file_paths(f"origin/{stable_branch}")

ci_commit = os.environ.get("CI_COMMIT_SHA", "")
ci_url_base = os.environ.get("CI_PROJECT_URL", "")

json_data = {
    "commit": ci_commit,
    "commit-url": f"{ci_url_base}/-/commit/{ci_commit}"
    if (ci_commit and ci_url_base)
    else "",
    "project-path": os.environ.get("CI_PROJECT_PATH", ""),
    "current-branch": args.current_branch,
    "stable-branch": stable_branch,
    "files": [],
}

for translation_branch, name in (
    part.strip().split(":", 1) for part in args.filenames.split(" ") if part.strip()
):
    current_path = matching_path(current_file_paths, name)
    old_path = matching_path(old_file_paths, name)

    if current_path is None and old_path is None:
        # No file in either branch.
        logger.warning(f"{name} does not exist in either the current or stable branch")
    elif current_path is None:
        logger.warning(f"{name} deleted in the current branch")
    elif old_path is None:
        logger.warning(f"{name} does not exist in the stable branch")

    content = combine_files(
        name,
        git_file_content("HEAD", current_path),
        git_file_content(f"origin/{stable_branch}", old_path),
        f"Will be unused in Tor Browser {current_version}!",
    )
    json_data["files"].append(
        {
            "name": name,
            "branch": translation_branch,
            "content": content,
        }
    )

with open(args.outname, "w") as file:
    json.dump(json_data, file)
