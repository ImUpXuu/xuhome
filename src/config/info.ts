/**
 * 兼容层 — 从 site.ts 重新导出配置
 * 保留此文件是为了兼容已有的 import { infoConfig } from '../config/info' 引用
 * 新代码请直接从 site.ts 导入 bannerConfig / subtitleConfig / footerConfig
 */
import { bannerConfig, subtitleConfig, footerConfig } from './site';

/** 旧版 infoConfig 结构，组合了 banner/subtitle/footer */
export const infoConfig = {
  subtitle: subtitleConfig,
  banner: bannerConfig,
  footer: footerConfig,
};
