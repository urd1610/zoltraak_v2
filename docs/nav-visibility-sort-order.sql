-- サイドバー表示順序設定（sort_order）を追加する場合のDDL
-- 事前に nav_visibility_settings テーブルが存在していることを確認してください。

ALTER TABLE nav_visibility_settings
  ADD COLUMN sort_order INT NULL COMMENT 'Sidebar ordering index';

CREATE INDEX idx_nav_visibility_sort_order
  ON nav_visibility_settings (sort_order);
