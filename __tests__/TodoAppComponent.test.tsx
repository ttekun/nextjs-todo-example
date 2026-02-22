import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodoAppComponent from '../src/components/TodoAppComponent';
import { getDuckDbStorage } from '../src/services/duckDbStorage';

// Mock storage service
const mockAddTodo = jest.fn().mockResolvedValue(true);
const mockDeleteTodo = jest.fn().mockResolvedValue(true);
const mockUpdateTodo = jest.fn().mockResolvedValue(true);

// Mock data
const mockTodos = [
  { id: 1, text: 'テストTODO 1', done: false },
  { id: 2, text: 'テストTODO 2', done: true }
];

jest.mock('../src/services/duckDbStorage', () => ({
  getDuckDbStorage: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    getAllTodos: jest.fn().mockResolvedValue(mockTodos),
    // Mock implementation matching SQL direct embedding approach
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
  
  test('Component should render correctly', async () => {
    render(<TodoAppComponent />);
    
    // Loading display should appear first
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
    
    // UI elements should be displayed after data is loaded
    await waitFor(() => {
      expect(screen.getByText('TODOアプリ (duck-WASM版)')).toBeInTheDocument();
    });
    
    // TODO list should be displayed
    await waitFor(() => {
      expect(screen.getByText('テストTODO 1')).toBeInTheDocument();
      expect(screen.getByText('テストTODO 2')).toBeInTheDocument();
    });
  });
  
  test('Should be able to add new TODO', async () => {
    render(<TodoAppComponent />);
    
    // Wait for data loading to complete
    await waitFor(() => {
      expect(screen.getByText('TODOアプリ (duck-WASM版)')).toBeInTheDocument();
    });
    
    // Enter value in input field
    const input = screen.getByPlaceholderText('TODOを入力...');
    fireEvent.change(input, { target: { value: '新しいTODO' } });
    
    // Click add button
    const addButton = screen.getByText('追加');
    fireEvent.click(addButton);
    
    // Confirm that storage service's addTodo was called
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
    
    // Note: In the actual component implementation, the input field is cleared
    // after async processing, so we don't test this here
  });
  
  test('Should be able to toggle TODO completion status', async () => {
    render(<TodoAppComponent />);
    
    // Wait for data loading to complete
    await waitFor(() => {
      expect(screen.getByText('テストTODO 1')).toBeInTheDocument();
    });
    
    // Click TODO to toggle completion status
    const todoItem = screen.getByText('テストTODO 1');
    fireEvent.click(todoItem);
    
    // Confirm that storage service's updateTodo was called
    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        done: true
      }));
    });
  });
  
  test('Should be able to delete TODO', async () => {
    render(<TodoAppComponent />);
    
    // Wait for data loading to complete
    await waitFor(() => {
      expect(screen.getByText('テストTODO 1')).toBeInTheDocument();
    });
    
    // Click delete button
    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);
    
    // Confirm that storage service's deleteTodo was called
    await waitFor(() => {
      expect(mockDeleteTodo).toHaveBeenCalledWith(1);
    });
  });
  
  test('Should be able to edit TODO', async () => {
    render(<TodoAppComponent />);
    
    // Wait for data loading to complete
    await waitFor(() => {
      expect(screen.getByText('テストTODO 1')).toBeInTheDocument();
    });
    
    // Click edit button
    const editButtons = screen.getAllByText('編集');
    fireEvent.click(editButtons[0]);
    
    // Confirm entering edit mode (input field is displayed)
    const editInput = screen.getByDisplayValue('テストTODO 1');
    expect(editInput).toBeInTheDocument();
    
    // Change input field value
    fireEvent.change(editInput, { target: { value: '編集されたTODO' } });
    
    // Click save button
    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);
    
    // Confirm that storage service's updateTodo was called
    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        text: '編集されたTODO'
      }));
    });
  });

  test('Should not get stuck on loading after remount during pending initialization', async () => {
    let resolveFirstInitialize: (() => void) | null = null;
    let closedDuringInit = false;

    const closeMock = jest.fn().mockImplementation(async () => {
      closedDuringInit = true;
    });

    const customStorage = {
      initialize: jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              resolveFirstInitialize = resolve;
            })
        )
        .mockImplementation(() => {
          if (closedDuringInit) {
            // Simulate an initialization deadlock caused by close() during init.
            return new Promise<void>(() => {});
          }
          return Promise.resolve();
        }),
      getAllTodos: jest.fn().mockResolvedValue(mockTodos),
      addTodo: mockAddTodo,
      deleteTodo: mockDeleteTodo,
      updateTodo: mockUpdateTodo,
      close: closeMock
    };

    (getDuckDbStorage as jest.Mock).mockReturnValue(customStorage);

    const firstRender = render(<TodoAppComponent />);
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();

    // Unmount while initialize() is still pending.
    firstRender.unmount();
    resolveFirstInitialize?.();

    render(<TodoAppComponent />);

    await waitFor(() => {
      expect(screen.getByText('TODOアプリ (duck-WASM版)')).toBeInTheDocument();
    });

    expect(closeMock).not.toHaveBeenCalled();
  });
});