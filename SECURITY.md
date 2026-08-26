# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| v5.0.0   | :white_check_mark: |
| < v5.0.0 | :x:                |

## Untrusted input

Commit subjects are untrusted: anyone who can land a commit chooses the text,
and this action pastes that text into release notes. Subjects are rendered as
literal text inside an inline-code span so they cannot contribute links,
images, mentions, issue references, raw HTML, or extra changelog entries.
Release tag names are untrusted for the same reason and never reach a shell as
source. See the [`changelog` output](README.md#changelog) for what this looks
like in practice.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use [GitHub's private vulnerability reporting](https://github.com/metcalfc/changelog-generator/security/advisories/new) to submit a report. You should receive a response within 48 hours.
