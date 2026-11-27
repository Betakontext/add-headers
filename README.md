# add-headers

Batch-injects SPDX license headers into all supported source files in a repository.

### Usage

bash

	npx tsx add-headers.ts <path-to-repo>

### Requirements

Node.js ≥ 18

A header.txt file in the target repo root with exactly two lines:

	SPDX-FileCopyrightText: 2026 xyz
	SPDX-License-Identifier: MIT

### Supported file types

Extension	Comment style

	.py, .sh, .ps1, .service, .toml, .yml, .yaml, .env	# SPDX-...
	.ts, .tsx, .js, .jsx, .astro, .css, .scss	// SPDX-...
	.html, .md	<!-- SPDX-... -->

Skipped

	Binary files (.png, .jpg, .webp, .ico, .mp4, .woff, .woff2, .bin)
	.json
	Directories: .git, node_modules, __pycache__, models, outputs

Behaviour

Idempotent — files already containing SPDX-License-Identifier are skipped. Prompts for confirmation before writing anything.

-----------------

Licence: MIT

Fell free to fork and PR to take it further.

Contact: dev@betakontext.de | Christoph Medicus
