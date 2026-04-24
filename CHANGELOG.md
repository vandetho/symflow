# Changelog

## [3.0.0](https://github.com/vandetho/symflow/compare/v2.8.0...v3.0.0) (2026-04-24)


### ⚠ BREAKING CHANGES

* Complete rewrite of the symflow package.

### Features

* add !php/const YAML support and blog state_machine example ([1eb07de](https://github.com/vandetho/symflow/commit/1eb07de174488b2c84dec9d970d44f9b9bb0f866))
* add !php/enum YAML tag support ([0652009](https://github.com/vandetho/symflow/commit/0652009449c9386974d0ddd2abdab544e1fbe37a))
* add CI workflow and update dependencies ([c2b0e2e](https://github.com/vandetho/symflow/commit/c2b0e2ed1c75f816c62402e202cfd1fd67004368))
* add core workflow and audit trail implementation ([6daf767](https://github.com/vandetho/symflow/commit/6daf7679357cc9430f7cc11d0151f4bc808d270f))
* add core workflow and audit trail implementation ([6268eb6](https://github.com/vandetho/symflow/commit/6268eb6ef400480b4ddaf7415518e88e1b6a6b73))
* add event handling to workflows ([3510d36](https://github.com/vandetho/symflow/commit/3510d368f2c3e30905a6fc48bc45756b3d298e59))
* add fork sibling cleanup and recursive state tracking ([709e7d7](https://github.com/vandetho/symflow/commit/709e7d7b93a5638d1586857f14f07c8dbd53eeea))
* add Graphviz DOT export, CLI, and @types/node ([0baffca](https://github.com/vandetho/symflow/commit/0baffcac19d1b3c9d3f162bb0289b66f94d5ffcd))
* add guard functionality to block transitions ([fb58e55](https://github.com/vandetho/symflow/commit/fb58e55a29df1d11c1ac7cdfbb871c17b1329676))
* add Mermaid stateDiagram-v2 export ([f4594e8](https://github.com/vandetho/symflow/commit/f4594e88049405ce4409016024a59bdea143e7f9))
* add metadata support to workflow events ([21787cd](https://github.com/vandetho/symflow/commit/21787cdcc11c8a7d7f62587c7487caeb85e2ea25))
* add new dependencies to package.json and lock file ([3bb043a](https://github.com/vandetho/symflow/commit/3bb043a5013e70550ab5c8fe90f6c9cd0745b6ef))
* add new events and types to workflow exports ([4c372da](https://github.com/vandetho/symflow/commit/4c372dae9ae6754ba71bb13f7599df78ead55238))
* add optional guards to transition checks ([ebc9e84](https://github.com/vandetho/symflow/commit/ebc9e84f9449984131168a29b569d0f004a264b6))
* add Symfony article workflow as example, test fixture, and docs ([2e33406](https://github.com/vandetho/symflow/commit/2e334066806302b4f756bbc2e28f76895c96e3c1))
* add weighted arcs and middleware system ([9d35694](https://github.com/vandetho/symflow/commit/9d35694cfef8d849558ad1e90d96f54b23a0fce6))
* add workflow definitions and enhance test coverage ([fa40e4c](https://github.com/vandetho/symflow/commit/fa40e4c04085bbce05af5f32becd8a7bd65ebd0b))
* **ci:** relocate and rename CI configuration file ([8de13f4](https://github.com/vandetho/symflow/commit/8de13f4e21b60fef4af16ee9832fbb85a0a620c6))
* **deps:** update dev dependencies and remove unused deps ([a615477](https://github.com/vandetho/symflow/commit/a615477becfe776e7bc95dad383079fa7f844418))
* **docs:** add Table of Contents to README ([a02b7fd](https://github.com/vandetho/symflow/commit/a02b7fd8420c5f2cd75fb2d5049509d9da34500c))
* enhance state management in workflow transitions ([83e17a2](https://github.com/vandetho/symflow/commit/83e17a22cd75252cb7aa2b31d19b7e104efa3386))
* enhance state management with fork sibling handling ([0df431b](https://github.com/vandetho/symflow/commit/0df431b8f36bcd2d011a511c533c9346777dc81d))
* **events:** enhance README with event handling examples ([ea4e436](https://github.com/vandetho/symflow/commit/ea4e4365069cbb62775deb7cd66f0a3a2ec0a917))
* improve StateMachine validation and state handling ([5df4e63](https://github.com/vandetho/symflow/commit/5df4e632d43987471a3a28bcb7c793340fee6e14))
* integrate EventEmitter for workflow event handling ([5a554ef](https://github.com/vandetho/symflow/commit/5a554ef5c051b36a5f9aef50f21b4f397a55ddeb))
* **README:** add badges for version, downloads, and license ([40fe17c](https://github.com/vandetho/symflow/commit/40fe17caef36745e6b7606eab67e624e18f436cd))
* refine state transitions with filtered next states ([b2bfeb9](https://github.com/vandetho/symflow/commit/b2bfeb9e82c0836b64527d35c7beb06c65e59ae9))
* remove all TypeScript definitions and compiled files ([8f3e1fb](https://github.com/vandetho/symflow/commit/8f3e1fb2dbcf31a3800090dbf1208e6ecb2ac84f))
* restructure into monorepo with TypeScript and Laravel packages ([709faec](https://github.com/vandetho/symflow/commit/709faec96f667d0d45b3eb2813ca2ae8dc520c3f))
* **symflow:** refine state transition logic handling ([dfb9f82](https://github.com/vandetho/symflow/commit/dfb9f82943e9a709c7df2bddd004a256eeda8806))
* **ts:** add PHP/Laraflow export format ([e445b97](https://github.com/vandetho/symflow/commit/e445b97fc3014c028efaea8076d2beed3b020b99))
* update README with new Workflow and StateMachine APIs ([6d65760](https://github.com/vandetho/symflow/commit/6d65760d7aad13180685c5d27d0e50218f1dd8e1))
* v2.0.0 — rewrite as Symfony-compatible workflow engine ([e3b5a49](https://github.com/vandetho/symflow/commit/e3b5a49b0ecbe797bd2b9a33cf6d58796569b1df))
* **workflows:** add permissions for contents and PRs ([1681354](https://github.com/vandetho/symflow/commit/1681354935b5bae421a0b87357863529f5e8a7ca))


### Bug Fixes

* add symflowbuilder-release-bot to auto-merge actor check ([e8f4834](https://github.com/vandetho/symflow/commit/e8f48346d77c735468eefa83df88b098a93e0bf3))
* change default TypeScript export import path from @symflow/core to symflow ([2b3dc60](https://github.com/vandetho/symflow/commit/2b3dc60c991fe772ab183f528a97048c54c0b7cf))
* **ci:** add NPM_TOKEN to publish workflow ([0b07546](https://github.com/vandetho/symflow/commit/0b07546078d4cc5bc357127dab03e3b22a3ef5a6))
* **ci:** add owner field to create-github-app-token for cross-repo push ([964d80e](https://github.com/vandetho/symflow/commit/964d80e21276c20b525c0cb2b53bad5f5a2dd8d8))
* **ci:** always reset laraflow remote URL with fresh token ([4f09007](https://github.com/vandetho/symflow/commit/4f090079cebdf53e3c3c11b88b6c39804543dcb3))
* **ci:** point release-please to packages/ts for package.json ([f224298](https://github.com/vandetho/symflow/commit/f224298dbefcf61b9bdfaf4cdbf21a07425e3d19))
* **ci:** remove unnecessary Codecov token usage ([f4ce824](https://github.com/vandetho/symflow/commit/f4ce8240f6902c31314ce710a4712b2bb9416785))
* **ci:** resolve TypeScript 6.x baseUrl deprecation and update GitHub App token config ([e8e7fc0](https://github.com/vandetho/symflow/commit/e8e7fc099598146748fff553b20dc765472720d9))
* **ci:** scope GitHub App token to both symflow and laraflow repos ([c4c8f24](https://github.com/vandetho/symflow/commit/c4c8f2468319c4a6d4b43ef62962371cb3cc1652))
* **ci:** switch publish workflow to OIDC trusted publishers ([daebc34](https://github.com/vandetho/symflow/commit/daebc34be70b6524a28be8d5065ee40370f1eeb0))
* **ci:** switch release-please to manifest mode for monorepo ([04f2838](https://github.com/vandetho/symflow/commit/04f28384e3aff3a32c9f7a44a9f3c396f2dae360))
* **ci:** use LARAFLOW_PAT for subtree-split push ([8c43472](https://github.com/vandetho/symflow/commit/8c434728a23697d13c7655a6305ea67e753916a1))
* **docs:** correct CI badge URL file extension in README ([090e006](https://github.com/vandetho/symflow/commit/090e0067cfa254c63f85a514d730bff8979def73))
* enhance state tracing in getAllFromStatesLeadingTo ([27d9654](https://github.com/vandetho/symflow/commit/27d965417bffa11f86af164f92699804a729de52))
* optimize state handling and add new utility method ([ddb7137](https://github.com/vandetho/symflow/commit/ddb7137e61568cb4555878e77c756d4b41647553))
* remove unused meta param in mermaid export ([68513a6](https://github.com/vandetho/symflow/commit/68513a672e5f0acc8f46955128374a5b7e39f50e))
* resolve prettier formatting issues in CI ([5b3741f](https://github.com/vandetho/symflow/commit/5b3741f3a5ebcc00766a79f79dfa87a6645e8c32))
* sync package-lock.json with @types/node dependency ([a47a966](https://github.com/vandetho/symflow/commit/a47a96663fdfc7a64020271d572baaa5a320a034))
* use bot app token for release-please to trigger publish workflow ([08a2e32](https://github.com/vandetho/symflow/commit/08a2e321f2b9efbd1b187508be95f9e7c58f10fa))
* use GITHUB_TOKEN for PR approval, bot token for merge ([5e70428](https://github.com/vandetho/symflow/commit/5e704282c8e42af1b1342f37e3b4e1d13336912e))
* **workflow:** add missing newline in release.yaml ([b1c67f7](https://github.com/vandetho/symflow/commit/b1c67f756e4f582002944801eb85de8f1cd7eac2))

## [2.5.0](https://github.com/vandetho/symflow/compare/v2.4.2...v2.5.0) (2026-04-23)


### Features

* add Graphviz DOT export, CLI, and @types/node ([0baffca](https://github.com/vandetho/symflow/commit/0baffcac19d1b3c9d3f162bb0289b66f94d5ffcd))
* add weighted arcs and middleware system ([9d35694](https://github.com/vandetho/symflow/commit/9d35694cfef8d849558ad1e90d96f54b23a0fce6))


### Bug Fixes

* **ci:** resolve TypeScript 6.x baseUrl deprecation and update GitHub App token config ([e8e7fc0](https://github.com/vandetho/symflow/commit/e8e7fc099598146748fff553b20dc765472720d9))
* sync package-lock.json with @types/node dependency ([a47a966](https://github.com/vandetho/symflow/commit/a47a96663fdfc7a64020271d572baaa5a320a034))

## [2.4.2](https://github.com/vandetho/symflow/compare/v2.4.1...v2.4.2) (2026-04-21)


### Bug Fixes

* **ci:** switch publish workflow to OIDC trusted publishers ([daebc34](https://github.com/vandetho/symflow/commit/daebc34be70b6524a28be8d5065ee40370f1eeb0))

## [2.4.1](https://github.com/vandetho/symflow/compare/v2.4.0...v2.4.1) (2026-04-21)


### Bug Fixes

* **ci:** add NPM_TOKEN to publish workflow ([0b07546](https://github.com/vandetho/symflow/commit/0b07546078d4cc5bc357127dab03e3b22a3ef5a6))

## [2.4.0](https://github.com/vandetho/symflow/compare/v2.3.4...v2.4.0) (2026-04-21)


### Features

* add Mermaid stateDiagram-v2 export ([f4594e8](https://github.com/vandetho/symflow/commit/f4594e88049405ce4409016024a59bdea143e7f9))


### Bug Fixes

* remove unused meta param in mermaid export ([68513a6](https://github.com/vandetho/symflow/commit/68513a672e5f0acc8f46955128374a5b7e39f50e))

## [2.3.4](https://github.com/vandetho/symflow/compare/v2.3.3...v2.3.4) (2026-04-21)


### Bug Fixes

* resolve prettier formatting issues in CI ([5b3741f](https://github.com/vandetho/symflow/commit/5b3741f3a5ebcc00766a79f79dfa87a6645e8c32))

## [2.3.3](https://github.com/vandetho/symflow/compare/v2.3.2...v2.3.3) (2026-04-20)


### Bug Fixes

* change default TypeScript export import path from @symflow/core to symflow ([2b3dc60](https://github.com/vandetho/symflow/commit/2b3dc60c991fe772ab183f528a97048c54c0b7cf))

## [2.3.2](https://github.com/vandetho/symflow/compare/v2.3.1...v2.3.2) (2026-04-20)


### Bug Fixes

* add symflowbuilder-release-bot to auto-merge actor check ([e8f4834](https://github.com/vandetho/symflow/commit/e8f48346d77c735468eefa83df88b098a93e0bf3))
* use GITHUB_TOKEN for PR approval, bot token for merge ([5e70428](https://github.com/vandetho/symflow/commit/5e704282c8e42af1b1342f37e3b4e1d13336912e))

## [2.3.1](https://github.com/vandetho/symflow/compare/v2.3.0...v2.3.1) (2026-04-20)


### Bug Fixes

* use bot app token for release-please to trigger publish workflow ([08a2e32](https://github.com/vandetho/symflow/commit/08a2e321f2b9efbd1b187508be95f9e7c58f10fa))

## [2.3.0](https://github.com/vandetho/symflow/compare/v2.2.0...v2.3.0) (2026-04-20)


### Features

* add !php/enum YAML tag support ([0652009](https://github.com/vandetho/symflow/commit/0652009449c9386974d0ddd2abdab544e1fbe37a))

## [2.2.0](https://github.com/vandetho/symflow/compare/v2.1.0...v2.2.0) (2026-04-20)


### Features

* add !php/const YAML support and blog state_machine example ([1eb07de](https://github.com/vandetho/symflow/commit/1eb07de174488b2c84dec9d970d44f9b9bb0f866))

## [2.1.0](https://github.com/vandetho/symflow/compare/v2.0.0...v2.1.0) (2026-04-20)


### Features

* add Symfony article workflow as example, test fixture, and docs ([2e33406](https://github.com/vandetho/symflow/commit/2e334066806302b4f756bbc2e28f76895c96e3c1))

## [2.0.0](https://github.com/vandetho/symflow/compare/v1.18.0...v2.0.0) (2026-04-20)


### ⚠ BREAKING CHANGES

* Complete rewrite of the symflow package.

### Features

* v2.0.0 — rewrite as Symfony-compatible workflow engine ([e3b5a49](https://github.com/vandetho/symflow/commit/e3b5a49b0ecbe797bd2b9a33cf6d58796569b1df))
