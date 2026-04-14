#!/usr/bin/env python3
"""
Server02 ファイルスキャナー (Windows用)
SMB共有フォルダをスキャンしてMySQLにインデックスを作成します。

使い方:
  pip install mysql-connector-python
  python server02_scanner.py                      # 全共有フォルダをスキャン
  python server02_scanner.py --share "①　全社"     # 特定の共有フォルダのみ
  python server02_scanner.py --dry-run             # DBに書き込まない
  python server02_scanner.py --workers 16          # 並列度を上げる
"""

import argparse
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import List, Optional, Tuple

try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
except ImportError:
    print()
    print("ERROR: mysql-connector-python が必要です。")
    print("インストール: pip install mysql-connector-python")
    print()
    sys.exit(1)


# ==================== 設定 ====================

DB_CONFIG = {
    "host": "192.168.0.156",
    "port": 3306,
    "user": "alluser",
    "password": "wew111589",
    "database": "zoltraak",
    "charset": "utf8mb4",
}

SMB_SERVER = "192.168.0.153"

SHARES = [
    "①　全社",
    "②　掲示板",
    "③　生産グループ",
    "④　技術グループ",
    "⑤　品質グループ",
    "⑥　生産管理グループ",
    "⑧　情報グループ",
    "スキャナ文書",
]


# ==================== ユーティリティ ====================


def format_size(size: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size < 1024:
            return f"{size:,.1f} {unit}"
        size /= 1024
    return f"{size:,.1f} PB"


def format_elapsed(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    if m > 0:
        return f"{m}分{s}秒"
    return f"{s}秒"


def unc_path(share_name: str) -> str:
    """Windows UNC パスを返す"""
    return f"\\\\{SMB_SERVER}\\{share_name}"


def get_mtime(path: str) -> Optional[datetime]:
    try:
        return datetime.fromtimestamp(os.path.getmtime(path))
    except (OSError, PermissionError):
        return None


# ==================== スキャナー ====================


def scan_directory(dir_path: str, share_name: str, depth: int, max_depth: int):
    """
    1つのディレクトリをスキャンし、(レコードリスト, サブディレクトリリスト) を返す。
    os.scandir() を使い stat 呼び出しを最小化する。
    """
    records = []
    subdirs = []

    if depth > max_depth:
        return records, subdirs

    try:
        with os.scandir(dir_path) as it:
            for entry in it:
                try:
                    name = entry.name
                    if name.startswith("."):
                        continue

                    is_dir = entry.is_dir(follow_symlinks=False)
                    full_path = entry.path
                    file_size = 0
                    modified_at = None

                    if not is_dir:
                        try:
                            info = entry.stat(follow_symlinks=False)
                            file_size = info.st_size
                            modified_at = datetime.fromtimestamp(info.st_mtime)
                        except (OSError, PermissionError):
                            pass
                    else:
                        try:
                            info = entry.stat(follow_symlinks=False)
                            modified_at = datetime.fromtimestamp(info.st_mtime)
                        except (OSError, PermissionError):
                            pass
                        subdirs.append(full_path)

                    ext = None
                    if not is_dir:
                        _, e = os.path.splitext(name)
                        if e:
                            ext = e[1:].lower()

                    records.append((
                        share_name,        # share_name
                        full_path,         # file_path
                        name,              # file_name
                        ext,               # extension
                        file_size,         # file_size
                        modified_at,       # modified_at
                        1 if is_dir else 0,  # is_directory
                        depth,             # depth
                        dir_path,          # parent_path
                    ))

                except (OSError, PermissionError):
                    continue
    except (OSError, PermissionError):
        pass

    return records, subdirs


def scan_share(share_name: str, max_depth: int, workers: int, stop_flag: list):
    """
    共有フォルダを並列BFSでスキャンする。
    stop_flag[0] が True になったら中断。
    進捗は (ファイル数, フォルダ数, サイズ) のリストとして返す。
    """
    root = unc_path(share_name)

    # アクセスチェック
    try:
        os.listdir(root)
    except (OSError, PermissionError) as e:
        return None, str(e)

    all_records = []
    file_count = 0
    dir_count = 0
    total_size = 0

    # BFS: キューにディレクトリを積み、ThreadPool で並列処理
    queue = [(root, 0)]  # (path, depth)

    with ThreadPoolExecutor(max_workers=workers) as executor:
        while queue and not stop_flag[0]:
            # キューからバッチを取り出して並列実行
            batch = queue[:workers * 2]
            queue = queue[workers * 2:]

            futures = {
                executor.submit(scan_directory, path, share_name, depth, max_depth): (path, depth)
                for path, depth in batch
            }

            for future in as_completed(futures):
                if stop_flag[0]:
                    break
                try:
                    records, subdirs = future.result()
                    all_records.extend(records)

                    for rec in records:
                        if rec[6]:  # is_directory
                            dir_count += 1
                        else:
                            file_count += 1
                            total_size += rec[4]  # file_size

                    for sd in subdirs:
                        sd_depth = futures[future][1] + 1
                        if sd_depth <= max_depth:
                            queue.append((sd, sd_depth))

                except Exception:
                    pass

            # 進捗表示
            total = file_count + dir_count
            print(
                f"\r  スキャン中... {total:,} 件 "
                f"(ファイル: {file_count:,}, フォルダ: {dir_count:,}, "
                f"サイズ: {format_size(total_size)})",
                end="",
                flush=True,
            )

    print()  # 改行
    return all_records, None


# ==================== DB 操作 ====================


def db_connect():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except MySQLError as e:
        print(f"ERROR: DB接続失敗: {e}")
        return None


def db_create_scan_log(conn, share_name: Optional[str]) -> int:
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO server02_scan_logs (share_name, status) VALUES (%s, 'running')",
        (share_name,),
    )
    conn.commit()
    log_id = cursor.lastrowid
    cursor.close()
    return log_id


def db_update_scan_log(conn, log_id: int, status: str, files: int, dirs: int, size: int, error: str = None):
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE server02_scan_logs SET status=%s, total_files=%s, total_directories=%s, "
        "total_size=%s, error_message=%s, completed_at=NOW() WHERE id=%s",
        (status, files, dirs, size, error, log_id),
    )
    conn.commit()
    cursor.close()


def db_clear_share(conn, share_name: str):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM server02_files WHERE share_name = %s", (share_name,))
    conn.commit()
    cursor.close()


def db_insert_batch(conn, records: list, batch_size: int = 1000):
    if not records:
        return
    cursor = conn.cursor()
    query = (
        "INSERT INTO server02_files "
        "(share_name, file_path, file_name, extension, file_size, "
        "modified_at, is_directory, depth, parent_path) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    )
    total = len(records)
    for i in range(0, total, batch_size):
        batch = records[i : i + batch_size]
        cursor.executemany(query, batch)
        conn.commit()
        done = min(i + batch_size, total)
        print(f"\r  DB登録中... {done:,}/{total:,}", end="", flush=True)
    cursor.close()
    print()  # 改行


# ==================== メイン ====================


def main():
    parser = argparse.ArgumentParser(
        description="Server02 ファイルスキャナー — SMB共有をスキャンしてMySQLにインデックス作成",
    )
    parser.add_argument("--share", type=str, help="特定の共有フォルダのみスキャン")
    parser.add_argument("--max-depth", type=int, default=10, help="最大ディレクトリ深度 (default: 10)")
    parser.add_argument("--workers", type=int, default=8, help="並列ワーカー数 (default: 8)")
    parser.add_argument("--batch-size", type=int, default=1000, help="DB挿入バッチサイズ (default: 1000)")
    parser.add_argument("--dry-run", action="store_true", help="スキャンのみ (DBに書き込まない)")
    args = parser.parse_args()

    # バナー
    print()
    print("=" * 60)
    print("  Server02 ファイルスキャナー")
    print("=" * 60)
    print(f"  DB:          {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    print(f"  SMBサーバー: \\\\{SMB_SERVER}")
    print(f"  最大深度:    {args.max_depth}")
    print(f"  ワーカー数:  {args.workers}")
    print(f"  バッチサイズ: {args.batch_size}")
    print(f"  Dry Run:     {'Yes' if args.dry_run else 'No'}")
    print("=" * 60)
    print()

    # DB接続
    conn = None
    if not args.dry_run:
        conn = db_connect()
        if not conn:
            sys.exit(1)
        print("DB接続: OK")
        print()

    # スキャン対象
    shares_to_scan = [args.share] if args.share else list(SHARES)

    stop_flag = [False]  # mutable flag for Ctrl+C
    grand_files = 0
    grand_dirs = 0
    grand_size = 0
    grand_start = time.time()
    results_summary = []

    try:
        for idx, share_name in enumerate(shares_to_scan):
            print(f"[{idx + 1}/{len(shares_to_scan)}] {share_name}")
            print(f"  パス: {unc_path(share_name)}")

            share_start = time.time()

            # スキャン
            records, error = scan_share(share_name, args.max_depth, args.workers, stop_flag)

            if error:
                print(f"  ERROR: {error}")
                results_summary.append((share_name, 0, 0, 0, time.time() - share_start, error))
                if conn:
                    log_id = db_create_scan_log(conn, share_name)
                    db_update_scan_log(conn, log_id, "failed", 0, 0, 0, error)
                print()
                continue

            if stop_flag[0]:
                print("  中断されました")
                break

            # 集計
            file_count = sum(1 for r in records if not r[6])
            dir_count = sum(1 for r in records if r[6])
            total_size = sum(r[4] for r in records if not r[6])
            elapsed = time.time() - share_start

            # DB保存
            if conn and not args.dry_run:
                log_id = db_create_scan_log(conn, share_name)
                print(f"  既存データ削除中...", end="", flush=True)
                db_clear_share(conn, share_name)
                print(" OK")
                db_insert_batch(conn, records, args.batch_size)
                db_update_scan_log(conn, log_id, "completed", file_count, dir_count, total_size)

            grand_files += file_count
            grand_dirs += dir_count
            grand_size += total_size
            results_summary.append((share_name, file_count, dir_count, total_size, elapsed, None))

            print(f"  完了: {file_count:,} ファイル, {dir_count:,} フォルダ, "
                  f"{format_size(total_size)}, {format_elapsed(elapsed)}")
            print()

    except KeyboardInterrupt:
        stop_flag[0] = True
        print("\n\n  Ctrl+C: スキャンを中断しました\n")

    finally:
        if conn:
            conn.close()

    # 全体サマリー
    grand_elapsed = time.time() - grand_start
    print("=" * 60)
    print("  スキャン結果")
    print("=" * 60)
    print()

    if results_summary:
        # ヘッダー
        print(f"  {'共有フォルダ':<20} {'ファイル':>10} {'フォルダ':>10} {'サイズ':>12} {'時間':>10} {'状態'}")
        print(f"  {'-' * 20} {'-' * 10} {'-' * 10} {'-' * 12} {'-' * 10} {'-' * 6}")
        for name, fc, dc, sz, el, err in results_summary:
            status = "失敗" if err else "OK"
            print(f"  {name:<20} {fc:>10,} {dc:>10,} {format_size(sz):>12} {format_elapsed(el):>10} {status}")
        print()

    print(f"  合計ファイル:   {grand_files:,}")
    print(f"  合計フォルダ:   {grand_dirs:,}")
    print(f"  合計サイズ:     {format_size(grand_size)}")
    print(f"  合計時間:       {format_elapsed(grand_elapsed)}")
    print()
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
