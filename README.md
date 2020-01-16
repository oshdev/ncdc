<img align="right" alt="Ajv logo" width="160" src="./icon.png">


# NCDC

NCDC (or node cdc) is a tool that takes a consumer contract (written in yaml)
and tests the specified endpoints against a producer. You can also run a single
command to mock those endpoints.

The point of using this tool is to ensure that each endpoint you use in
development is called in the same way and responds in the same way as the
endpoints in your live environment. There's not much point in testing against
mock APIs that don't strongly resemble your live APIs.

## Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Example config](#example-config)
  - [Generating JSON schemas](#generating-json-schemas)
  - [Running tests](#running-tests)
  - [Serving mocks](#serving-mocks)
- [CLI Usage](#cli-usage)
- [Generate command](#generate)
- [Test command](#test)
- [Serve command](#serve)

## Getting started

### Installation

`npm install ncdc --save-dev` or `yarn add ncdc -D`

### Example config

config.yml:

```yaml
- name: Books
  request:
    method: GET
    endpoints:
      - /api/books/123
      - /api/books/456
    serveEndpoint: /api/books/*
  response:
    code: 200
    headers:
      content-type: application/json
    type: object
    serveBody:
      {
        ISBN: "9780141187761",
        ISBN_13: 978-0141187761,
        author: George Orwell,
        title: 1984 Nineteen Eighty-Four,
      }
```

This configuration file contains a single config with the name Books.

You can find more information about writing configs [here](./CONFIG.md)

### Generating JSON schemas

`npx ncdc generate ./config.yml --output ./schemas`

This will create JSON schemas for any request and response types specified in
your cnofig file. `string`, `number`, `boolean` and `object` are internally
recognised, so schemas will not be generated for them.

Generating schemas is optional but can be useful for caching purposes.

You can find more information about generating schemas [here](#generate)

### Running tests

`npx ncdc test ./config.yml https://example.com`

This will run tests for each configuration. In this case, it will run a separate
test for each specified endpoint. It will make sure that GET requests to
https://example.com/api/books/123 and https://example.com/api/books/456 both
meet these requirements:

- It responds with a 200 status code
- It responds with the content-type header set to application/json
- The response body is an object

You can find more information about test mode [here](#test)

### Serving mocks

`npx ncdc serve ./config.yml 3000`

This will serve each configured endpoint on port 3000. As `serveEndpoint` is set
to `/api/books/*`, any requests starting with
`localhost:3000/api/books/<anything>` will respond with the following:

- Status code as 200
- content-type header as application/json
- body as the value of `serveBody`

You can find more information about serve mode [here](#serve)

## CLI usage

```
$ npx ncdc --help
ncdc <command>

Commands:
  ncdc generate <configPath>        Generates a json schema for each type
                                    specified in the config file
  ncdc serve <configPath> [port]    Serves configured endpoints
  ncdc test <configPath> <baseURL>  Tests configured endpoints

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]

Examples:
  ncdc generate ./config.yml                Generates json schemas for any Type
                                            specified in config.yml
  ncdc serve ./config.yml 4000              Serves the mock API endpoints
                                            defined in config.yml on port 4000
  ncdc test ./config.yml                    Tests that the responses for the API
  https://mysite.com                        endpoints defined in config.yml
                                            match the configured parameters
```

## Generate

### CLI Usage
```
$ npx ncdc generate --help
ncdc generate <configPath>

Generates a json schema for each type specified in the config file

Positionals:
  configPath  path to the ncdc config file                   [string] [required]

Options:
  --version                   Show version number                      [boolean]
  --help                      Show help                                [boolean]
  --tsconfigPath, -c          a path to the tsconfig file which contains the
                              types specified in the given config file
                                           [string] [default: "./tsconfig.json"]
  --outputPath, -o, --output  sets an output folder for the json schemas
                                             [string] [default: "./json-schema"]

Examples:
  ncdc generate ./config.yml  Generates json schemas for any type specified in
                              config.yml
```

## Test

### CLI Usage
```
ncdc test <configPath> <baseURL>

Tests configured endpoints

Positionals:
  configPath  path to the ncdc config file                   [string] [required]
  baseURL     the URL that your endpoints should be accessed through
                                                             [string] [required]

Options:
  --version           Show version number                              [boolean]
  --help              Show help                                        [boolean]
  --schemaPath        specify a path to load json schemas from, rather than
                      generating schmas for types specified in ncdc config at
                      runtime                                           [string]
  --tsconfigPath, -c  a path to the tsconfig file which contains the types
                      specified in the given config file
                                           [string] [default: "./tsconfig.json"]

Examples:
  ncdc test ./config.yml                    Tests that the responses for the API
  https://mysite.com                        endpoints defined in config.yml
                                            match the configured parameters
```

## Serve

### CLI Usage
```
ncdc serve <configPath> [port]

Serves configured endpoints

Positionals:
  configPath  path to the ncdc config file                   [string] [required]
  port        port to serve the API on                  [number] [default: 4000]

Options:
  --version           Show version number                              [boolean]
  --help              Show help                                        [boolean]
  --schemaPath        specify a path to load json schemas from, rather than
                      generating schmas for types specified in ncdc config at
                      runtime                                           [string]
  --tsconfigPath, -c  a path to the tsconfig file which contains the types
                      specified in the given config file
                                           [string] [default: "./tsconfig.json"]

Examples:
  ncdc serve ./config.yml 4000  Serves the mock API endpoints defined in
                                config.yml on port 4000
```
