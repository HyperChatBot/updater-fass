import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import axios from "axios";

interface Author {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

interface Uploader {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

interface Assets {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string;
  uploader: Uploader;
  content_type: string;
  state: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

interface Release {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: Author;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: Assets[];
  tarball_url: string;
  zipball_url: string;
  body: string;
}

const platformSuffixMap: Record<string, string> = {
  darwin: ".app.tar.gz",
  linux: ".AppImage.tar.gz",
  win64: ".msi.zip",
};

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const { target, arch, current_version } = context.bindingData;
  const suffix = platformSuffixMap[target ?? ""];

  if (suffix) {
    // List releases
    // https://docs.github.com/en/rest/releases/releases
    const { data: releases } = await axios.get<Release[]>(
      "https://api.github.com/repos/Hyper-Chat-Bot/hyperchat/releases"
    );

    // Filter the latest release version.
    const latestRelease = releases.find(
      (item) => !item.draft && !item.prerelease
    );

    if (latestRelease) {
      const binaryAsset = latestRelease.assets.find((assets) =>
        assets.name.endsWith(suffix)
      );
      const sigAsset = latestRelease.assets.find((asset) =>
        asset.name.endsWith(`${suffix}.sig`)
      );

      if (binaryAsset && sigAsset) {
        const { data: sigContent } = await axios.get<string>(
          sigAsset.browser_download_url
        );

        context.res = {
          status: 200,
          body: {
            url: binaryAsset.browser_download_url,
            version: latestRelease.tag_name,
            notes: latestRelease.body,
            pub_date: latestRelease.published_at,
            signature: sigContent,
          },
        };
        return;
      }
    }
  }

  // Respond with a status code of 204 No Content if there is no update available.
  context.res = {
    status: 204,
  };
};

export default httpTrigger;
