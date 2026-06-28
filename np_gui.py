import sys
import os
from datetime import datetime
from PyQt6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout,
                             QLabel, QLineEdit, QPushButton, QMessageBox)
from PyQt6.QtCore import Qt

BASE_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
POSTS_DIR = os.path.join(BASE_DIR, 'src', 'content', 'posts')

def sanitize_filename(name):
    name = name.strip().replace(' ', '-')
    name = ''.join(c for c in name if c not in r'<>:"/\|?*')
    return name if name else 'untitled'

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("新建博客文章")
        self.setFixedSize(420, 280)

        layout = QVBoxLayout()
        layout.setSpacing(10)

        layout.addWidget(QLabel("文章标题 *"))
        self.title_edit = QLineEdit()
        self.title_edit.setPlaceholderText("必填")
        layout.addWidget(self.title_edit)

        layout.addWidget(QLabel("文章 md 文件名 *（不含 .md）"))
        self.filename_edit = QLineEdit()
        self.filename_edit.setPlaceholderText("必填，如 my-post")
        layout.addWidget(self.filename_edit)

        layout.addWidget(QLabel("分类（选填）"))
        self.category_edit = QLineEdit()
        layout.addWidget(self.category_edit)

        layout.addWidget(QLabel("标签（选填，逗号分隔）"))
        self.tags_edit = QLineEdit()
        layout.addWidget(self.tags_edit)

        btn = QPushButton("创建文章")
        btn.clicked.connect(self.create_post)
        layout.addWidget(btn)

        self.setLayout(layout)

    def create_post(self):
        title = self.title_edit.text().strip()
        filename = self.filename_edit.text().strip()
        category = self.category_edit.text().strip()
        tags_text = self.tags_edit.text().strip()

        if not title:
            QMessageBox.warning(self, "错误", "请填写文章标题")
            return
        if not filename:
            QMessageBox.warning(self, "错误", "请填写 md 文件名")
            return

        filename = sanitize_filename(filename) + '.md'
        filepath = os.path.join(POSTS_DIR, filename)

        if os.path.exists(filepath):
            QMessageBox.warning(self, "错误", f"{filename} 已存在")
            return

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        if tags_text:
            tags = [f'"{t.strip()}"' for t in tags_text.split(',') if t.strip()]
            tags_str = f"[{', '.join(tags)}]"
        else:
            tags_str = "[]"

        frontmatter = f"""---
title: "{title}"
published: {now}
description: ""
tags: {tags_str}
category: "{category}"
---
"""

        os.makedirs(POSTS_DIR, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(frontmatter)

        QMessageBox.information(self, "成功", f"已创建: {filename}")
        self.close()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    sys.exit(app.exec())
