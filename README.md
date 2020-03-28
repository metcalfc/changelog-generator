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

There are three blocks you will need. The first is an additional run block after your checkout. By default an action checkout is shallow. So add:

    - name: Checkout
      uses: actions/checkout@v2
    # By default the checkout is shallow. Fetch all tags, branches, and history.
    - run: |
        git fetch --depth=1 origin +refs/tags/*:refs/tags/*
        git fetch --no-tags --prune --depth=1 origin +refs/heads/*:refs/remotes/origin/*
        git fetch --prune --unshallow

Next you will need to generate the changelog itself. To get the changelog between the SHA of the commit that triggered the action and the tag of the latest release:

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

Lastly you need to use the changelog.

    - name: Get the changelog
      run: echo "${{ steps.changelog.outputs.changelog }}"

Why do we need `myToken`? Read more here: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret

## Example use case

[Generating the release notes for a GitHub Release.](.github/workflows/release.yml)
