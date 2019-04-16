import * as React from 'react';
import TodoFooter from './footer';
import TodoItem from './item';
import {
  ALL_TODOS,
  ACTIVE_TODOS,
  COMPLETED_TODOS,
  ENTER_KEY
} from './constants';
import { IDebeUse } from 'debe';

interface ITodo {
  id?: string;
  title: string;
  completed: boolean;
}
interface ITodoAppProps {
  title: string;
  collection: IDebeUse<ITodo>;
  todos: ITodo[];
}
class TodoApp extends React.Component<ITodoAppProps> {
  state = {
    nowShowing: ALL_TODOS,
    editing: null,
    newTodo: ''
  };

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodo: event.target.value });
  };

  handleNewTodoKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.keyCode !== ENTER_KEY) {
      return;
    }

    event.preventDefault();

    var title = this.state.newTodo.trim();

    if (title) {
      this.props.collection.insert({ title });
      this.setState({ newTodo: '' });
    }
  };

  toggleAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    var checked = event.target.checked;
    this.props.collection.insert(
      this.props.todos.map(x => ({ ...x, completed: checked }))
    );
  };

  toggle = (todo: ITodo) => {
    this.props.collection.insert({ ...todo, completed: !todo.completed });
  };

  destroy = (todo: ITodo) => {
    this.props.collection.remove(todo.id || '');
  };

  edit = (todo: ITodo) => {
    this.setState({ editing: todo.id });
  };

  save = (todo: ITodo, title: string) => {
    this.props.collection.insert({ ...todo, title });
    this.setState({ editing: null });
  };

  cancel = () => {
    this.setState({ editing: null });
  };

  clearCompleted = () => {
    const completed = this.props.todos.filter(x => x.completed);
    this.props.collection.remove(completed.map(x => x.id || ''));
  };

  push = (nowShowing: string) => {
    this.setState({ nowShowing });
  };

  render() {
    var footer;
    var main;
    var todos = this.props.todos;

    var shownTodos = todos.filter(todo => {
      switch (this.state.nowShowing) {
        case ACTIVE_TODOS:
          return !todo.completed;
        case COMPLETED_TODOS:
          return todo.completed;
        default:
          return true;
      }
    });

    var todoItems = shownTodos.map(todo => {
      return (
        <TodoItem
          key={todo.id}
          todo={todo}
          onClearCompleted={() => {}}
          onToggle={this.toggle.bind(this, todo)}
          onDestroy={this.destroy.bind(this, todo)}
          onEdit={this.edit.bind(this, todo)}
          editing={this.state.editing === todo.id}
          onSave={this.save.bind(this, todo)}
          onCancel={this.cancel}
        />
      );
    });

    var activeTodoCount = todos.reduce((accum, todo) => {
      return todo.completed ? accum : accum + 1;
    }, 0);

    var completedCount = todos.length - activeTodoCount;

    if (activeTodoCount || completedCount) {
      footer = (
        <TodoFooter
          push={this.push}
          count={activeTodoCount}
          completedCount={completedCount}
          nowShowing={this.state.nowShowing}
          onClearCompleted={this.clearCompleted}
        />
      );
    }

    if (todos.length) {
      main = (
        <section className="main">
          <input
            id="toggle-all"
            className="toggle-all"
            type="checkbox"
            onChange={this.toggleAll}
            checked={activeTodoCount === 0}
          />
          <label htmlFor="toggle-all" />
          <ul className="todo-list">{todoItems}</ul>
        </section>
      );
    }

    return (
      <div style={{ flex: 1 }}>
        <header className="header">
          <h1>{this.props.title || 'todo'}</h1>
          <input
            className="new-todo"
            placeholder="What needs to be done?"
            value={this.state.newTodo}
            onKeyDown={this.handleNewTodoKeyDown}
            onChange={this.handleChange}
            autoFocus={true}
          />
        </header>
        {main}
        {footer}
      </div>
    );
  }
}

export default TodoApp;
