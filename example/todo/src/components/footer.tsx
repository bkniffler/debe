import * as React from 'react';
import classNames from 'classnames';
import { pluralize } from './utils';
import { ALL_TODOS, ACTIVE_TODOS, COMPLETED_TODOS } from './constants';

interface IFooterProps {
  count: number;
  completedCount: number;
  nowShowing: string;
  push: (item: any) => void;
  onClearCompleted: (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
}

export default function(props: IFooterProps) {
  var activeTodoWord = pluralize(props.count, 'item');
  var clearButton = null;

  if (props.completedCount > 0) {
    clearButton = (
      <button className="clear-completed" onClick={props.onClearCompleted}>
        Clear completed
      </button>
    );
  }

  var nowShowing = props.nowShowing;
  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{props.count}</strong> {activeTodoWord} left
      </span>
      <ul className="filters">
        <li>
          <a
            href={null as any}
            onClick={() => props.push(ALL_TODOS)}
            className={classNames({ selected: nowShowing === ALL_TODOS })}
          >
            All
          </a>
        </li>{' '}
        <li>
          <a
            href={null as any}
            onClick={() => props.push(ACTIVE_TODOS)}
            className={classNames({
              selected: nowShowing === ACTIVE_TODOS
            })}
          >
            Active
          </a>
        </li>{' '}
        <li>
          <a
            href={null as any}
            onClick={() => props.push(COMPLETED_TODOS)}
            className={classNames({
              selected: nowShowing === COMPLETED_TODOS
            })}
          >
            Completed
          </a>
        </li>
      </ul>
      {clearButton}
    </footer>
  );
}
