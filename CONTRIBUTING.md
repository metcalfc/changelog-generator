Right now, I think the action is fairly feature complete. There are always more special cases that could be covered. This action was started as an simple changlelog. There are other more complex actions out there.

I'm happy to take a look if you've got a feature you'd let to add. Please don't be offended if it doesn't make it in. Its awesome to see all the interest in the action.

If you've found a bug submit an issue and PR and we will get it sorted.

Thanks!

## Development

```sh
make install   # install dependencies
make test      # run the test suite
make           # lint, format-check, test, and build
```

`make test` runs the Node test runner over `test/`:

- `test/changelog.test.mjs` drives `changelog.sh` against throwaway git
  repositories built on the fly, covering ordering, the `reverse` flag, the
  empty-base-ref fallback, refs with slashes, and failure modes.
- `test/refs.test.mjs` covers the ref-name validation in `refs.mjs` that keeps
  shell metacharacters out of `changelog.sh`.
- `test/dist.test.mjs` rebuilds the bundle and fails if the committed `dist/`
  is stale — `action.yml` runs `dist/index.js`, so it must be regenerated with
  `make build` and committed alongside any source change.
