import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodoAppComponent from '../src/components/TodoAppComponent';
import { getDuckDbStorage } from '../src/services/duckDbStorage';

// ストレージサービスをモック
const mockAddTodo = jest.fn().mockResolvedValue(true);
const mockDeleteTodo = jest.fn().mockResolvedValue(true);
const mockUpdateTodo = jest.fn().mockResolvedValue(true);

// モックデータ
const mockTodos = [
  { id: 1, text: 'テストTODO 1', done: false },
  { id: 2, text: 'テストTODO 2', done: true }
];

jest.mock('../src/services/duckDbStorage', () => ({
  getDuckDbStorage: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    getAllTodos: jest.fn().mockResolvedValue(mockTodos),
    // SQL直接埋め込み方式に合わせたモック実装
    addTodo: mockAddTodo,
    deleteTodo: mockDeleteTodo,
    updateTodo: mockUpdateTodo,
    close: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('TodoAppComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('コンポーネントが正しくレンダリングされること', async () => {
    render(<TodoAppComponent />);
    
    // ローディング表示が最初に表示される
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
    
    // データが読み込まれた後のUI要素が表示される
    await waitFor(() => {
      expect(screen.getByText('TODOアプリ (duck-WASM版)')).toBeInTheDocument();
    });
    
    // TODOリストが表示される
    await waitFor(() => {
      expect(screen.getByText('テストTODO 1')).toBeInTheDocument();
      expect(screen.getByText('テストTODO 2')).toBeInTheDocument();
    });
  });
  
  test('新しいTODOを追加できること', async () => {
    render(<TodoAppComponent />);
    
    // データ読み込み完了を待つ
    await waitFor(() => {
      expect(screen.getByText('TODOアプリ (duck-WASM版)')).toBeInTheDocument();
    });
    
    // 入力フィールドに値を入力
    const input = screen.getByPlaceholderText('TODOを入力...');
    fireEvent.change(input, { target: { value: '新しいTODO' } });
    
    // 追加ボタンをクリック
    const addButton = screen.getByText('追加');
    fireEvent.click(addButton);
    
    // ストレージサービスのaddTodoが呼ばれたことを確認
    await waitFor(() => {
      expect(mockAddTodo).toHaveBeenCalledWith(expect.objectContaining({
        id: expect.any(Number),
        text: '新しいTODO',
        done: false
      }));

      // ID is a positive number (unique ID generation)
      const calledArgs = mockAddTodo.mock.calls[0][0];
      expect(calledArgs.id).toBeGreaterThan(0);
    });
    
    // 注意: 実際のコンポーネントの実装では、入力フィールドがクリアされるのは
    // 非同期処理の後なので、ここではテストしない
  });
  
  test('TODOの完了状態を切り替えられること', async () => {
    render(<TodoAppComponent />);
    
    // データ読み込み完了を待つ
    await waitFor(() => {
      expect(screen.getByText('テストTODO 1')).toBeInTheDocument();
    });
    
    // TODOをクリックして完了状態を切り替え
    const todoItem = screen.getByText('テストTODO 1');
    fireEvent.click(todoItem);
    
    // ストレージサービスのupdateTodoが呼ばれたことを確認
    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        done: true
      }));
    });
  });
  
  test('TODOを削除できること', async () => {
    render(<TodoAppComponent />);
    
    // データ読み込み完了を待つ
    await waitFor(() => {
      expect(screen.getByText('テストTODO 1')).toBeInTheDocument();
    });
    
    // 削除ボタンをクリック
    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);
    
    // ストレージサービスのdeleteTodoが呼ばれたことを確認
    await waitFor(() => {
      expect(mockDeleteTodo).toHaveBeenCalledWith(1);
    });
  });
  
  test('TODOを編集できること', async () => {
    render(<TodoAppComponent />);
    
    // データ読み込み完了を待つ
    await waitFor(() => {
      expect(screen.getByText('テストTODO 1')).toBeInTheDocument();
    });
    
    // 編集ボタンをクリック
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    
    // 編集モードに入ったことを確認（入力フィールドが表示される）
    const editInput = screen.getByDisplayValue('テストTODO 1');
    expect(editInput).toBeInTheDocument();
    
    // 入力フィールドの値を変更
    fireEvent.change(editInput, { target: { value: '編集されたTODO' } });
    
    // 保存ボタンをクリック
    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);
    
    // ストレージサービスのupdateTodoが呼ばれたことを確認
    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        text: '編集されたTODO'
      }));
    });
  });
}); 