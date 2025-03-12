import { Signal } from '@lumino/signaling';

import { ReactWidget } from '@jupyterlab/ui-components';

import { Dialog } from '@jupyterlab/apputils';

import * as React from 'react';

interface Log {
  type: 'log' | 'warn' | 'error';
  msg: string;
}

interface IProps {
  logs: LogsModel;
}

export class LogsModel {
  constructor(kernelId: string) {
    // Using a broadcast channel here, since it's easier to track them by name
    this._channel = new BroadcastChannel(`/kernel-broadcast/${kernelId}`);

    this._logs = [];

    this._channel.onmessage = event => {
      this._logs.push({type: event.data.type, msg: event.data.msg});
      this._logsChanged.emit();
    };
  }

  get logs(): Log[] {
    return this._logs;
  }

  get logsChanged(): Signal<this, void> {
    return this._logsChanged;
  }

  private _logsChanged: Signal<this, void> = new Signal(this);
  private _logs: Log[];
  private _channel: BroadcastChannel;
}

export class LogsComponent extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);

    this._logsModel = props.logs;

    this._logsModel.logsChanged.connect(() => {
      this.forceUpdate();
    })
  }

  render(): JSX.Element {
    const logs = this._logsModel.logs.map(log => {
      return (
        <div>
          {log.type}: {log.msg}
        </div>
      );
    });

    return <div>{logs}</div>;
  }

  private _logsModel: LogsModel;
}

export class LogsDialog extends Dialog<void> {
  constructor(logsModel: LogsModel) {
    super({body: ReactWidget.create(<LogsComponent logs={logsModel} />)});

    this.title.label = 'Kernel Logs';
  }
}
