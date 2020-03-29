# Get a changelog between two references

This Action returns a markdown formatted changelog between two git references.

## Inputs

### `head-ref`

The name of the head reference. Default `${{github.sha}}`.

### `base-ref`

The name of the second branch. Defaults to the `tag_name` of the latest release.

## Outputs

### `changelog`

Markdown formatted changelog.

## Example usage

There are two blocks you will need. First you will need to generate the changelog itself. To get the changelog between the SHA of the commit that triggered the action and the tag of the latest release:

    - name: Generate changelog
      id: changelog
      uses: metcalfc/changelog-generator@v0.1.1
      with:
        myToken: ${{ secrets.GITHUB_TOKEN }}

Or if you have two specific references you want:

    - name: Generate changelog
      id: changelog
      uses: metcalfc/changelog-generator@v0.1.1
      with:
        myToken: ${{ secrets.GITHUB_TOKEN }}
        head-ref: 'v0.0.2'
        base-ref: 'v0.0.1'

Then you can to use the resulting changelog.

    - name: Get the changelog
      run: echo "${{ steps.changelog.outputs.changelog }}"

Why do we need `myToken`? Read more here: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret

## Example use case

[Generating the release notes for a GitHub Release.](.github/workflows/release.yml)

## Acknowledgements

I took the basic framework for this action from: [jessicalostinspace/commit-difference-action](https://github.com/jessicalostinspace/commit-difference-action). Thanks @jessicalostinspace.
