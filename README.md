# Get a changelog between two references

This Action returns a markdown formatted changelog between two git references. There are other projects that use milestones, labeled PRs, etc. Those are just to much work for simple projects.

I just wanted a simple way to populate the body of a GitHub Release.

<a href="https://github.com/metcalfc/changelog-generator/releases/tag/v1.0.0"><img alt="Example Release Notes" src="./release-notes.png" width="400"></a>

## Inputs

### `mytoken`

A GITHUB_TOKEN with the ability to pull from the repo in question. This is required.

Why do we need `myToken`? Read more here: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret

### `head-ref`

The name of the head reference. Default `${{github.sha}}`.

### `base-ref`

The name of the second branch. Defaults to the `tag_name` of the latest GitHub release. *This must be a GitHub release. Git tags or branches will not work.*

## Outputs

### `changelog`

Markdown formatted changelog.

## Example usage

There are two blocks you will need. First you will need to generate the changelog itself. To get the changelog between the SHA of the commit that triggered the action and the tag of the latest release:

    - name: Generate changelog
      id: changelog
      uses: metcalfc/changelog-generator@v1.0.0
      with:
        myToken: ${{ secrets.GITHUB_TOKEN }}

Or if you have two specific references you want:

    - name: Generate changelog
      id: changelog
      uses: metcalfc/changelog-generator@v1.0.0
      with:
        myToken: ${{ secrets.GITHUB_TOKEN }}
        head-ref: 'v0.0.2'
        base-ref: 'v0.0.1'

Then you can to use the resulting changelog.

    - name: Get the changelog
      run: echo "${{ steps.changelog.outputs.changelog }}"

## Example use case

[Generating the release notes for a GitHub Release.](.github/workflows/release.yml)

## Open Discussions for feature requests or questions

Issues are for folks who are actively using the action and running into an "issue" (bug, missing doc, etc). 

Feature requests should be in the [discussion section.](https://github.com/metcalfc/changelog-generator/discussions).
Just to set expectations the bar for a new feature getting added is going to be very high. There is a
cost to adding features in the development and maintainance of the feature. So if you want to jump in and
help develop and maintain lets discuss. If you want to fire off feature ideas, go for it. Just understand its
very likely that without someone willing to take up the task, they won't get implemented. 

## Keep up-to-date with GitHub Dependabot

Since [Dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-actions-up-to-date-with-github-dependabot)
has [native GitHub Actions support](https://docs.github.com/en/github/administering-a-repository/configuration-options-for-dependency-updates#package-ecosystem),
to enable it on your GitHub repo all you need to do is add the `.github/dependabot.yml` file:

```yaml
version: 2
updates:
  # Maintain dependencies for GitHub Actions
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'daily'
```
## Troubleshooting

### Error not found

```
Error: Not Found
```

If you are seeing this error its likely that you do not yet have a GitHub release. You might have a git tag and that shows up in the release tab. The
API this Action uses only works with GitHub Releases. Convert one of your tags to a release and you'll be on your way. You can check out how this
repository uses this action and GitHub releases for an [example](.github/workflows/release.yml).


## Acknowledgements

I took the basic framework for this action from: [jessicalostinspace/commit-difference-action](https://github.com/jessicalostinspace/commit-difference-action). Thanks @jessicalostinspace.
