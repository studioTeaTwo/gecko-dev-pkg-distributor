# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, # You can obtain one at http://mozilla.org/MPL/2.0/.

# This script formats and exports builtin-api schema files by markdown for the docs site.
#
# The design is based on MDN: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action
# schema spec: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/schema.html

import json
import os
import shutil
import textwrap

# direcotry
here = os.path.abspath(os.path.dirname(__file__))
print(here)
topsrcdir = os.path.abspath(os.path.dirname(os.path.dirname(here)))

# repository
repository_name = 'gecko-dev-for-ssi'
repository_url = f"https://gitlab.com/studioteatwo/{repository_name}/-/blob/mvp/"
doc_list = [
    'browser/components/extensions/schemas/ssi/ssi.json',
    'browser/components/extensions/schemas/ssi/ssi.nostr.json'
]
file_paths = []
for doc in doc_list:
    file_paths.append(os.path.join(topsrcdir, doc))

# output
output_directory = "output"
if os.path.exists(output_directory):
    shutil.rmtree(output_directory)
os.makedirs(output_directory)


def main():
    for file_path in file_paths:
        file_name = os.path.basename(file_path).replace(".json", "")
        os.makedirs(os.path.join(output_directory, file_name))
        output_file_path = os.path.join(here, output_directory, file_name, f"README.md")

        print(f"-----{file_name}-----")

        try:
            with open(file_path, 'r', encoding='utf-8') as json_file:
                data = json.load(json_file)

            # Returns the text of the summary and create each member file nested inside it.
            summary_text = build(data)

            with open(output_file_path, 'w', encoding='utf-8') as output_file:
                output_file.write(summary_text)

            print(f"-----end:{file_name}-----")

        except FileNotFoundError:
            print(f"Error: The file {file_path} was not found.")
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON format in {file_path}.")
        except Exception as e:
            print(f"Error: An unexpected error occurred while processing {file_path} - {e}")


def build(data):
    output_text = ''
    for item in data:
        if item["namespace"] == "manifest":
            continue

        output_text += f"# {item['namespace']}\n\n"

        if 'description' in item:
            output_text += f"{item['description']}\n\n"

        if 'permissions' in item:
            output_text += f"## Required Permissions\n\n"
            output_text += f"`{item['permissions']}`\n\n"

        for key in ['types', 'properties', 'functions', 'events']:
            if key in item:
                print(f"{key.capitalize()}")
                output_text += f"## {key.capitalize()}{'()' if type == 'functions' else ''}\n\n"

                for sub_item in item[key]:
                    name = 'id' if key == 'types' else 'name'
                    print(f"[build]: {sub_item[name]} proceeds...")
                    output_text += f"### [{sub_item[name]}]({sub_item[name]}.md)\n\n"

                    if 'description' in sub_item:
                        output_text += f"{sub_item['description']}\n\n"

                    create_member_file(item['namespace'], key, sub_item)

        output_text += get_repository_text(item['namespace'])

    return output_text

def create_member_file(namespace, type, data):
    key = 'id' if type == 'types' else 'name'
    print(f"[create_member]: {type} {namespace}.{data[key]} proceeds...")

    output_file_path = os.path.join(here, output_directory, namespace, f"{data[key]}.md")
    output_text = f"# {namespace}.{data[key]}{'()' if type == 'functions' else ''}\n\n"

    if 'description' in data:
        output_text += f"{data['description']}\n\n"

    if 'async' in data:
        output_text += f"This is an asynchronous function that returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).\n\n"

    if type in ['functions', 'events'] :
        output_text += '## Syntax\n\n'
        output_text += f"{build_syntax(namespace, type, data)}\n\n"

    if 'properties' in data:
        output_text += f"### {'Type' if type == 'types' else 'Properties'}\n\n"
        output_text += f"{build_properties(data['properties'])}"

    if 'parameters' in data:
        if type == 'events':
            output_text += f"## addListener syntax\n\n"
        output_text += f"### Parameters\n\n"
        output_text += f"{build_parameters(data['parameters'])}"

    if 'returns' in data:
        output_text += f"### Return value\n\n"
        output_text += f"{data['returns']['description']}\n\n"

    if type in ['functions', 'events'] :
        output_text += f"## Examples\n\n{{{{#include fragments/examples_{data[key]}.md }}}}\n\n"

    output_text += get_repository_text(namespace)

    with open(output_file_path, 'w', encoding='utf-8') as output_file:
        output_file.write(output_text)

def build_parameters(data):
    output_text = ''
    for item in data:
        print(f"[build_parameters]: {item['name']} proceeds...")

        output_text += f"#### `{item['name']}`"
        if 'optional' in item and item['optional']:
            output_text += ' (optional)'
        output_text += '\n\n'

        type = item['$ref'] if '$ref' in item else item['type']
        output_text += f"`{type}`. {item['description']}\n\n"

        if 'type' in item and item['type'] == 'object':
            property = item['properties']
            for key in property:
                output_text += f"> `{key}`"
                if 'optional' in property[key] and property[key]['optional']:
                    output_text += ' (optional)'
                output_text += '\n>\n'

                output_text += f"> `{property[key]['type']}`. {property[key]['description']}\n>\n"
            output_text += '\n'

    if len(data) == 0:
        output_text += 'None.\n\n'

    return output_text

def build_properties(data):
    output_text = ''
    for key in data:
        print(f"[build_properties]: {key} proceeds...")

        value = data[key]
        output_text += f"#### `{key}`"
        if 'optional' in value and value['optional']:
            output_text += ' (optional)'
        output_text += '\n\n'

        output_text += f"`{value['type']}`. {value['description']}\n\n"

    return output_text

def build_syntax(namespace, type, data):
    if type == 'events':
        function_name = f"browser.{namespace}.{data['name']}"
        return textwrap.dedent('''\
            ```js
            {function_name}.addListener(listener)
            {function_name}.removeListener(listener)
            {function_name}.hasListener(listener)
            ```

            Events have three functions:

            `addListener(listener)`
            Adds a listener to this event.

            `removeListener(listener)`
            Stop listening to this event. The listener argument is the listener to remove.

            `hasListener(listener)`
            Check whether listener is registered for this event. Returns `true` if it is listening, `false` otherwise.
        ''').format(function_name=function_name).strip()

    # functions
    output_text = f"```js\n"
    return_value = ''
    if 'returns' in data:
        return_name = 'object' if '$ref' in data['returns'] else data['returns']['type']
        return_value += f"const {return_name}Value = "

    if len(data['parameters']) == 0:
        output_text += f"{return_value}{'await' if data.get('async') else ''} browser.{namespace}.{data['name']}()\n"
        output_text += f"```\n"
        return output_text

    output_text += f"{return_value}{'await' if data['async'] else ''} browser.{namespace}.{data['name']}(\n"

    for param in data['parameters']:
        output_text += f"\t{param['name']}, // {'optional ' if param.get('optional') else ''}{'object' if param.get('$ref') else param['type']}\n"

    output_text += f")\n"
    output_text += f"```\n"

    return output_text

def get_repository_text(namespace):
    repository = repository_url
    if namespace == 'ssi':
        repository += doc_list[0]
    elif namespace == "ssi.nostr":
        repository += doc_list[1]

    return f"```admonish\nThis documentation is derived from [{namespace}.json]({repository}) in {repository_name}.\n```\n\n"

main()
