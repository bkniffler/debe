import * as React from 'react';
import classNames from 'classnames';
import { ESCAPE_KEY, ENTER_KEY } from './constants';

interface IItemProps {
  todo: any;
  editing: boolean;
  onSave: (val: string) => void;
  onEdit: () => void;
  onDestroy: () => void;
  onToggle: () => void;
  onCancel: (event: any) => void;
  onClearCompleted: (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
}

export default class TodoItem extends React.Component<IItemProps> {
  state = { editText: this.props.todo.title };

  handleSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    var val = this.state.editText.trim();
    if (val) {
      this.props.onSave(val);
      this.setState({ editText: val });
    } else {
      this.props.onDestroy();
    }
  };

  handleEdit = () => {
    this.props.onEdit();
    this.setState({ editText: this.props.todo.title });
  };

  handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.which === ESCAPE_KEY) {
      this.setState({ editText: this.props.todo.title });
      this.props.onCancel(event);
    } else if (event.which === ENTER_KEY) {
      this.handleSubmit(event);
    }
  };

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (this.props.editing) {
      this.setState({ editText: event.target.value });
    }
  };

  render() {
    return (
      <li
        className={classNames({
          completed: this.props.todo.completed,
          editing: this.props.editing
        })}
      >
        <div className="view">
          <input
            value={''}
            className="toggle"
            type="checkbox"
            checked={this.props.todo.completed}
            onChange={this.props.onToggle}
          />
          <label onDoubleClick={this.handleEdit}>{this.props.todo.title}</label>
          <button className="destroy" onClick={this.props.onDestroy} />
        </div>
        <input
          className="edit"
          value={this.state.editText || ''}
          onChange={this.handleChange}
          onKeyUp={this.handleKeyDown}
        />
      </li>
    );
  }
}
