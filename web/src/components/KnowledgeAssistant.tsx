import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, List, Tag, Typography, Divider, Space, Modal, Spin } from 'antd';
import { SearchOutlined, BookOutlined, ArrowRightOutlined, MessageOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

export default function KnowledgeAssistant() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');

  const fetchResults = useCallback(async (q: string, category: string = '') => {
    setLoading(true);
    try {
      let url = '/knowledge/search';
      let params: any = { q };
      if (category) {
        url = '/knowledge/category/' + encodeURIComponent(category);
        params = {};
      }
      const res = await api.get(url, { params });
      setResults(res.data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get('/knowledge/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
    fetchResults('');
  }, [fetchResults]);

  const handleSearch = () => {
    setActiveCategory('');
    fetchResults(query);
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    setQuery('');
    fetchResults('', category);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i} style={{ background: '#fff7e6', color: '#d46b08', padding: '0 2px', borderRadius: 2 }}>{part}</mark> : part
    );
  };

  return (
    <Card className="page-card" title={
      <Space>
        <BookOutlined style={{ color: '#52c41a' }} />
        <Text strong>📚 客服知识库</Text>
        <Tag color="green">申通客服管理条例</Tag>
      </Space>
    }>
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="输入关键词搜索客服规则，例如：投诉、理赔、派送..."
            prefix={<SearchOutlined />}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ flex: 1 }}
          />
          <Button type="primary" size="large" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
            搜索
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          {categories.map(cat => (
            <Tag
              key={cat}
              color={activeCategory === cat ? 'green' : 'blue'}
              onClick={() => handleCategoryClick(cat)}
              style={{ cursor: 'pointer', padding: '4px 10px' }}
            >
              {cat}
            </Tag>
          ))}
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : results.length > 0 ? (
        <List
          dataSource={results}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderLeft: `3px solid ${activeCategory ? '#52c41a' : '#1890ff'}`,
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#f5f7fa'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              onClick={() => setSelectedItem(item)}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space direction="vertical" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color="orange">{item.category}</Tag>
                    <Text strong style={{ fontSize: 14 }}>{highlightText(item.title, query)}</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {highlightText(item.content, query)}
                  </Text>
                </Space>
                <ArrowRightOutlined style={{ color: '#bfbfbf' }} />
              </Space>
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
          <MessageOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }} />
          <div>暂无相关知识条目</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>尝试搜索其他关键词，或点击上方分类浏览</div>
        </div>
      )}

      <Modal
        open={!!selectedItem}
        title={
          selectedItem ? (
            <Space>
              <Tag color="orange">{selectedItem.category}</Tag>
              <Text strong>{selectedItem.title}</Text>
            </Space>
          ) : undefined
        }
        onCancel={() => setSelectedItem(null)}
        footer={null}
        width={640}
      >
        {selectedItem && (
          <div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14, color: '#333' }}>
              {selectedItem.content}
            </div>
            <Divider />
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              <Text strong>关键词：</Text>
              {selectedItem.keywords.map((k, i) => (
                <Tag key={k} size="small" color="default" style={{ marginLeft: i > 0 ? 4 : 0 }}>
                  {k}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}