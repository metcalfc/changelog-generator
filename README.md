# Get a changelog between two references

This Action returns a markdown formatted changelog between two git references. There are other projects that use milestones, labeled PRs, etc. Those are just to much work for simple projects.

I just wanted a simple way to populate the body of a GitHub Release.

<a href="https://github.com/metcalfc/changelog-generator/releases/tag/v0.4.3"><img alt="Example Release Notes" src="./release-notes.png" width="400"></a>

## Inputs

### `mytoken`

A GITHUB_TOKEN with the ability to pull from the repo in question. This is required.

Why do we need `myToken`? Read more here: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret

### `head-ref`

The name of the head reference. Default `${{github.sha}}`.

### `base-ref`

The name of the second branch. Defaults to the `tag_name` of the latest release.

## `firstRelease`

The flag of base-ref setting when no release. Default `"commit"`.

If your repository has never published a release,
you can set the base reference through this parameter.

When this parameter is set to "commit", the base reference will be set to initial commit.
When this parameter is set to "tag", the base reference will be set to the latest tag.

## Outputs

### `changelog`

Markdown formatted changelog.

## Example usage

There are two blocks you will need. First you will need to generate the changelog itself. To get the changelog between the SHA of the commit that triggered the action and the tag of the latest release:

    - name: Generate changelog
      id: changelog
      uses: metcalfc/changelog-generator@v0.4.3
      with:
        myToken: ${{ secrets.GITHUB_TOKEN }}

Or if you have two specific references you want:

    - name: Generate changelog
      id: changelog
      uses: metcalfc/changelog-generator@v0.4.3
      with:
        myToken: ${{ secrets.GITHUB_TOKEN }}
        head-ref: 'v0.0.2'
        base-ref: 'v0.0.1'

Then you can to use the resulting changelog.

    - name: Get the changelog
      run: echo "${{ steps.changelog.outputs.changelog }}"

## Example use case

[Generating the release notes for a GitHub Release.](.github/workflows/release.yml)

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

## Acknowledgements

I took the basic framework for this action from: [jessicalostinspace/commit-difference-action](https://github.com/jessicalostinspace/commit-difference-action). Thanks @jessicalostinspace.
