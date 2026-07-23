# Independent Fork Compliance Audit

> Status date: 2026-07-23. Scope: the public repository
> [`DXShelley/obsidian-tasks-datetime`](https://github.com/DXShelley/obsidian-tasks-datetime), its current metadata, and a possible submission to the Obsidian Community Plugins directory. This is an engineering compliance assessment, not legal advice for any particular jurisdiction.

## Executive conclusion

Publishing this repository on GitHub as an independently branded derivative is generally compatible with the upstream MIT license **provided that** the upstream copyright and permission notice, and any applicable third-party notices, continue to accompany distributed copies. GitHub has no policy that automatically removes a lawful fork merely because it is a fork.

The project must **not** be submitted to the Obsidian Community Plugins directory in its present form. There are two independent blockers under Obsidian's current official policy:

1. `manifest.json` uses `obsidian-tasks-datetime`. The directory requires an ID that is both unique and does **not** contain `obsidian`.
2. The repository inherits upstream code. Obsidian does not allow forks in its directory unless the original author gives publicly verifiable written approval, or the fork author proves the original author is unreachable and the project has not been updated for at least six months. MIT permission alone does not satisfy that directory rule.

Thus, GitHub publication can continue after the actions below; Community Plugins submission must wait for both a compliant ID and the required upstream authorization (or the documented alternative condition).

## Repository-history decision

This repository is a standalone GitHub repository rather than a GitHub network
fork, but its current branch ancestry retains the upstream history. Replacing
that ancestry with a new root commit would **not** change the legal source of
the code, the MIT notice requirement, or Obsidian's directory fork rule. The
directory policy evaluates a fork by provenance, not by whether GitHub displays
the repository as a fork or whether its commit graph was retained.

A clean history can make a new project's maintenance history easier to read,
but it must never be used to obscure provenance. Before any such rewrite,
preserve and prominently publish the exact upstream project URL, base commit or
release, the original MIT license, required third-party notices, and the
independent-derivative statement. It does not make the current plugin eligible
for Community Plugins submission.

## Evidence reviewed

| Item | Result | Audit note |
| --- | --- | --- |
| `manifest.json` | `id`: `obsidian-tasks-datetime`; `name`: `Tasks Datetime`; `authorUrl`: `https://github.com/DXShelley` | New ID and display name avoid the upstream ID, but the ID contains the reserved term `obsidian`. |
| `package.json` | Package/repository/homepage point to `DXShelley/obsidian-tasks-datetime` | Consistent with an independent repository. |
| `README.md` | States it is independently maintained, not affiliated with or endorsed by the upstream project, and links to upstream attribution | This is the correct practical mitigation for source/affiliation confusion. |
| `LICENSE` | MIT license retained | Keep it in every source and release distribution. Confirm all historical copyright notices remain intact before each release. |
| Official directory index | No entry with ID `obsidian-tasks-datetime` and no entry named `Tasks Datetime` at the audit snapshot | This is only a point-in-time uniqueness check, not a reservation. Re-check immediately before submission. |

## Applicable requirements and risk assessment

| Area | Official requirement / rule | Current risk | Required disposition |
| --- | --- | --- | --- |
| Upstream code license | The [MIT license](https://spdx.org/licenses/MIT.html) permits use, copying, modification, publication, distribution, sublicensing and sale, subject to inclusion of the copyright and permission notice in all copies or substantial portions. | Medium until every release artifact and embedded notice is checked. | Preserve the root `LICENSE`, do not remove original copyright notices, and retain/add notices required by bundled third-party code or assets. |
| Identity and trademark | Obsidian requires directory plugins to respect its trademark policy and not use “Obsidian” in a way that makes users think the plugin is first-party ([Developer policies](https://docs.obsidian.md/Developer+policies)). GitHub prohibits trademark infringement and impersonation ([AUP](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies), [impersonation policy](https://docs.github.com/en/site-policy/acceptable-use-policies/github-impersonation)). | Medium. `Tasks Datetime` is not itself a claim of upstream affiliation, but the project is close in purpose and origin to a well-known plugin. | Keep the independent-derivative statement prominently in README and repository About; never describe it as official, endorsed, a continuation, or a replacement sanctioned by upstream. Use only the new logo and account identity. Obtain counsel or rename promptly if a trademark owner objects or users are demonstrably confused. |
| GitHub hosting | A user who posts content is responsible for having the right to post it and for applicable licenses; GitHub may remove content that violates law, Terms or policy ([ToS, sections C and D](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#c-acceptable-use)). Copyright notices are handled under GitHub's [DMCA policy](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy). | Low for an MIT-compliant, non-misleading derivative; medium if imported assets or notices are not cleared. | Maintain a dated provenance record. On a complaint, preserve evidence, promptly remove or replace disputed non-code material, and use the DMCA counter-notice process only after legal review. |
| Community Plugins ID | The [submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin) says the ID must be unique across published plugins **and cannot contain `obsidian`**. | **Critical: current ID is ineligible.** | Do not submit `obsidian-tasks-datetime`. If Community distribution is a goal, choose an ID without `obsidian` (for example, `tasks-datetime` only after a fresh uniqueness check) and migrate local installations deliberately. |
| Community fork rule | [Developer policies](https://docs.obsidian.md/Developer+policies) prohibit forks in the directory except with public, verifiable written approval from the original author, or proof that the author is unreachable and the project has had no update for six months; the original author must be credited. | **Critical: no qualifying approval/proof is recorded.** | Do not apply until a public written approval is obtained and linked from README/submission, or until the alternative condition is factually documented. Do not represent MIT as approval for directory listing. |
| Community security and disclosures | Directory policy prohibits obfuscation, client-side telemetry, internet-loaded dynamic ads and self-updating; it requires README disclosures for network use, out-of-vault access, payments/accounts, static ads and server-side telemetry. Obsidian notes that plugins can access computer files, network and install programs ([Plugin security](https://docs.obsidian.md/Extending+Obsidian/Plugin+security)). | Medium until the final bundle, dependencies and README are audited. | Before each release, scan source and built `main.js` for telemetry/network/self-update/out-of-vault access; remove prohibited behavior and disclose permitted behavior precisely in README with a privacy policy where required. |
| Release and supply chain | Obsidian installs release assets whose tag matches `manifest.json` version; required assets are `main.js`, `manifest.json`, and optional `styles.css` ([submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)). | Medium until a reproducible release process is established. | Build from a clean pinned Node/Yarn environment; attach only reviewed artifacts; verify release tag/version/asset hashes; retain a dependency SBOM/license report. |

## Required remediation checklist

### Before any public release

- [ ] Retain the exact upstream MIT copyright and permission notice in `LICENSE`; audit source headers, bundled code, fonts, icons, screenshots and copied documentation for additional required attributions.
- [ ] Keep the current README statement that the project is independent and not affiliated with, endorsed by, or supported by upstream. Add the same concise statement to the GitHub repository About/description if it is not already present.
- [ ] Remove or replace any upstream logo, screenshots, social preview, sponsorship link, release link, author identity, or wording that could imply upstream control. Do not use the upstream project’s GitHub Releases as a distribution channel.
- [ ] Record the actual maintainer identity/contact consistently in `manifest.json`, `package.json`, GitHub profile and security reporting route. Do not identify an upstream maintainer as this project's author or support contact.
- [ ] Generate and retain a dependency/license inventory for the exact lockfile and release artifact. MIT at the repository root does not replace third-party license obligations.
- [ ] Add a `SECURITY.md` with a private reporting route and supported-version policy. This aligns with Obsidian's security-reporting guidance and reduces responsible-disclosure ambiguity.
- [ ] Rebuild from the pinned Node version, run tests, and compare the release `main.js` and manifest against the reviewed commit before publishing.

### If seeking Obsidian Community Plugins listing

- [ ] First obtain publicly verifiable written permission from the upstream author(s) specifically allowing this fork's directory listing, and credit them as contributors. A GitHub issue/discussion response from an authorized maintainer is practical evidence; preserve its URL. **Without it, do not submit.**
- [ ] Change the plugin ID to a unique value without `obsidian`, then migrate docs, sample vaults, release assets and installation instructions. Changing an ID creates a distinct local plugin directory; communicate the migration to users.
- [ ] Re-check the current [community directory index](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json) immediately before selecting the new ID/name. The audit snapshot is not a reservation.
- [ ] Ensure the default-branch manifest is accurate, the version is valid `x.y.z`, and a same-tag GitHub Release contains exactly the required built assets.
- [ ] Complete the README disclosures for network/out-of-vault access/accounts/payments/telemetry, or explicitly state that the plugin does not use them only after verifying that claim against source and final bundle.
- [ ] Do not submit or imply acceptance before the automated review passes; directory policy permits removal for noncompliance, malware, uncooperative behavior, repeated violations, or unmaintained/severely broken plugins.

## Community conduct guidance

The lowest-friction presentation is factual: describe this as an independently maintained derivative focused on optional date-and-time precision, link upstream for provenance, and publish a concrete divergence/changelog. Avoid comparative marketing that disparages the upstream project or wording such as “official successor”, “the real Tasks”, or “replacement approved by the Tasks team”. Responding courteously to provenance and security issues is more protective than trying to minimize the relationship.

## Source register

All sources below are first-party policy, documentation, or license texts, accessed for this audit on 2026-07-23.

1. [SPDX MIT License text](https://spdx.org/licenses/MIT.html)
2. [GitHub Terms of Service: Acceptable Use](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#c-acceptable-use) and [User-Generated Content](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#d-user-generated-content)
3. [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies), [Impersonation](https://docs.github.com/en/site-policy/acceptable-use-policies/github-impersonation), and [Trademark Policy](https://docs.github.com/en/site-policy/content-removal-policies/github-trademark-policy)
4. [GitHub DMCA Takedown Policy](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy)
5. [Obsidian Developer policies](https://docs.obsidian.md/Developer+policies)
6. [Obsidian plugin submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) and [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
7. [Obsidian Plugin security](https://docs.obsidian.md/Extending+Obsidian/Plugin+security)
8. [Obsidian community directory repository](https://github.com/obsidianmd/obsidian-releases) and its [current plugin index](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json)

## Change triggers

Re-run this audit before changing the name, ID, author, licence, telemetry/network behavior, release process or Community Plugins submission. Policies and directory contents change; this document is a dated assessment, not a permanent clearance.
