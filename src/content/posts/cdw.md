---
title: "什么，要中考了？！ 快来压力你的同学~——让你的班级白板充满压力🍐！"
published: 2026-03-29 19:49:00
category: "技术"
---

# 倒计时壁纸生成器

一个模块化的桌面壁纸生成工具，为重要日子倒计时增添励志动力。

![Python](https://img.shields.io/badge/Python-3.6+-blue.svg)
![License](https://img.shields.io/badge/License-GPL--3.0-green.svg)
![Version](https://img.shields.io/badge/Version-2.1.6-orange.svg)

## ✨ 功能特性

- 🖼️ **自动获取 Bing 每日一图** 作为壁纸背景
- 📖 **一言 API 励志语录** 每日更新，传递感动与力量
- ⏰ **智能倒计时** 精确计算剩余天数和周数
- 🔧 **模块化设计** 壁纸生成与管理分离，清晰高效
- 🎨 **高度可定制** 字体、颜色、布局随心配置
- 🧹 **自动清理** 保留最近 3 天壁纸，节省空间

## 🚀 快速开始


<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe 
    src="https://player.bilibili.com/player.html?isOutside=true&aid=116312412002537&bvid=BV1mmXQBdE9v&cid=37074568582&p=1" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
    scrolling="no" 
    border="0" 
    frameborder="no" 
    framespacing="0" 
    allowfullscreen="true">
  </iframe>
</div>


**Windows 用户可以直接下载 exe 文件使用，无需安装 Python！**

- [📥 下载主程序](https://raw-githubusercontent-com-gh.2x.nz/ImUpXuu/CDW/refs/heads/main/dist/CountdownWallpaper.exe) - CountdownWallpaper.exe
- [📥 下载管理器](https://raw-githubusercontent-com-gh.2x.nz/ImUpXuu/CDW/refs/heads/main/dist/CDWManager.exe) - CDWManager.exe

**使用说明：**

1. 下载 `CountdownWallpaper.exe` 到任意目录
2. 首次运行会自动下载管理器或从上方链接手动下载
3. 使用管理器配置倒计时日期
4. 保存后自动生成壁纸

### 环境要求

- Python 3.6+
- Windows 系统
- 依赖库：
  ```bash
  pip install -r requirements.txt
  ```

### 使用方法

#### 方式一：使用管理器（推荐）

```bash
python cdwmanager.py
```

管理器提供图形界面，可以：

- 设置倒计时名称和日期
- 配置一言 API 参数
- 设置开机自启（通过注册表）
- 一键生成壁纸

#### 方式二：直接生成壁纸

```bash
python CountdownWallpaper.py
```

会自动读取 `cdw.json` 配置文件并生成壁纸。

### 配置文件

配置文件 `cdw.json` 格式：

```json
{
    "countdowns": [
        {
            "name": "地生会考",
            "date": "2026-06-23",
            "enabled": true
        }
    ],
    "wallpaper": {
        "update_time": "07:40",
        "auto_start": false,
        "font_path": "font.ttf",
        "theme": "blue"
    },
    "hitokoto": {
        "enabled": true,
        "types": ["d", "i", "k", "l"]
    }
}
```

## 📁 项目结构

```
countdown-wallpaper/
├── CountdownWallpaper.py    # 壁纸生成器（核心）
├── cdwmanager.py            # 管理器（PyQt5 GUI）
├── cdw.json                 # 配置文件
├── requirements.txt         # 依赖列表
├── font.ttf                 # 自定义字体（可选）
├── README.md               # 说明文档
└── LICENSE                 # GPL-3.0 协议
```

## 🔧 模块说明

### CountdownWallpaper.py - 壁纸生成器

**功能**：

- 从配置文件读取倒计时信息
- 获取 Bing 每日一图
- 调用一言 API 获取励志语录
- 生成带倒计时的壁纸
- 设置 Windows 壁纸

**特点**：

- 专注壁纸生成，无定时任务
- 从配置文件读取所有参数
- 简洁高效

### cdwmanager.py - 管理器

**功能**：

- 图形界面配置倒计时
- 管理多个倒计时项目
- 配置一言 API 参数
- 设置开机自启（注册表）
- 创建定时任务

**依赖**：PyQt5

## 📝 常见问题

### Q: 配置文件在哪里？

A: `cdw.json` 在项目根目录。首次运行管理器会自动创建。

### Q: 如何添加多个倒计时？

A: 运行 `cdwmanager.py`，在"倒计时管理"标签页中添加。

### Q: 开机自启是如何实现的？

A: 通过 Windows 注册表实现，位置：`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`

### Q: 一言 API 失败怎么办？

A: 程序会自动使用内置的备用诗句库。

### Q: 可以自定义壁纸样式吗？

A: 可以！编辑 `cdw.json` 中的配置参数。

## 🛠️ 打包为可执行文件

### 打包壁纸生成器

```bash
pyinstaller --onefile --windowed --icon=icon.ico CountdownWallpaper.py
```

### 打包管理器

```bash
pyinstaller --onefile --windowed --icon=icon.ico cdwmanager.py
```

## 📄 开源协议

本项目采用 [GNU General Public License v3.0](LICENSE) 开源协议。

## 🙏 致谢

- [Bing 每日一图](https://www.bing.com)
- [一言 API](https://hitokoto.cn) - 传递感动的句子
- [Pillow](https://python-pillow.org) - Python 图像处理库
- [PyQt5](https://www.riverbankcomputing.com/software/pyqt/) - Python GUI 框架

## 📧 联系方式

- GitHub: [@ImUpXuu](https://github.com/ImUpXuu)
- 作者：UpXuu

## 🌟 Star History

如果这个项目对你有帮助，请给一个 ⭐ Star 支持！

---

**让每一天的努力都闪闪发光！** ✨

```

```

```

```
