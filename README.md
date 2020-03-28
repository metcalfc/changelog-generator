# Get a changelog between two references

This Action returns the commit difference count between two git references.

## Inputs

### `head-ref`

The name of the head reference. Default `${{github.sha}}`.

### `base-ref`

The name of the second branch. Defaults to the `tag_name` of the latest release.

## Outputs

### `changelog`

Markdown formatted changelog.

## Example usage

    - name: Generate changelog
      id: changelog
      uses: metcalfc/changelog-generator@v0.0.1
      with:
        myToken: ${{ secrets.GITHUB_TOKEN }}

Or

    - name: Generate changelog
      id: changelog
      uses: metcalfc/changelog-generator@v0.0.1
      with:
        myToken: ${{ secrets.GITHUB_TOKEN }}
        head-ref: 'v0.0.2'
        base-ref: 'v0.0.1'

Why do we need `myToken`? Read more here: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
