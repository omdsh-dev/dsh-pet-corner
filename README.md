# @deepseek-ai/dsh-pet-corner

**Author / Maintainer:** [@Zacklinkk](https://github.com/Zacklinkk)

DSH 的轻量摸鱼角：右下角是一只可拖动的小猫，点击后可浏览猫、狗和狐狸图片、
猫咪知识与收藏。所有第三方请求都先经过宿主白名单代理，浏览器不会直接访问外站。

## 安装

```bash
# 已登录私有 npm registry
dsh plugin --profile web add @deepseek-ai/dsh-pet-corner@0.0.1-rc.3

# 本地开发 checkout
dsh plugin --profile web add link:/path/to/dsh-pet-corner
```

包内已经声明 `dsh.bundle.patch`；`dsh plugin add` 会自动维护 Profile Bundle。
不要手工修改 profile manifest，也不要重复插入 `pet-corner` loader row，否则会得到
`duplicate loader entry id`。

## 功能与网络边界

- 小猫挂件、来源开关、默认狗狗品种和自动换图周期；
- 收藏仅保存在当前浏览器的 `localStorage`；
- 图片面板打开后才会通过宿主白名单代理访问 Cataas、Dog CEO、RandomFox、
  TheCatAPI 和 Cat Facts；仅加载页面不会预热这些上游；
- 设置通过插件自有的 `/plugins/dsh-pet-corner/api/settings` 读写，不依赖 DSH rc.3
  配置面的 namespace allowlist；该端点仅接受 loopback 同源请求；
- 插件不需要 API Key。上游不可用或返回非成功状态时，代理会以 HTTP 200 返回
  包内图片或兼容 JSON，避免把预期的第三方故障暴露成浏览器 4xx/5xx；图片面板仍可重试。

## 兼容性

| 组件 | 支持范围 |
| --- | --- |
| DSH | `>=0.1.0-rc.3 <0.2.0` |
| Node.js | `>=22.19.0` |
| Profile | `web` |

宿主路由使用 rc.3 的 `webServer` 服务名；本版本不兼容 rc.1 的 `httpServer` 名称。
设置页使用现存的 `settings.section` slot，但持久化不经过通用 settings API。

## 开发

```bash
npm install --legacy-peer-deps
DSH_NODE_MODULES=/path/to/dsh-runtime/node_modules npm run setup:dsh-workspace
npm run typecheck
npm test
npm run build
npm pack
```

构建产出 `lib/index.js`（宿主）和 `lib/client.js`（浏览器 ModuleLoader 包）。测试和
smoke 不访问真实宠物上游；代理行为用本地替身验证。

## License

BSD-3-Clause
