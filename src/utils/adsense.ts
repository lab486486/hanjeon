import enabledData from "../data/adsense/enabled.json";
import adsTxtData from "../data/adsense/ads-txt.json";
import headScriptData from "../data/adsense/head-script.json";

export type AdsenseConfig = {
  enabled: boolean;
  ads_txt: string;
  head_script: string;
};

export function getAdsenseConfig(): AdsenseConfig {
  return {
    enabled: enabledData.enabled !== false,
    ads_txt: String(adsTxtData.content || "").trim(),
    head_script: String(headScriptData.script || "").trim(),
  };
}

export function hasHeadScript(config: AdsenseConfig = getAdsenseConfig()): boolean {
  return config.enabled && Boolean(config.head_script);
}
