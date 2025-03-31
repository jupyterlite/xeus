export interface IParsedCommands {
    install: IInstallationCommandOptions;
    run: string;
  }
  export interface IInstallationCommandOptions {
    channels?: string[];
    specs?: string[];
    pipSpecs?: string[];
    isPipCommand?: boolean;
  }
  
  export type SpecTypes = 'specs' | 'pipSpecs';

export const parseCommandLine = (code: string): IParsedCommands => {
    let result: IParsedCommands = {
      install: {},
      run: code
    };
    const codeLines = code.split('\n');
    if (codeLines.length > 1) {
      result = { ...parseLines(codeLines) };
    } else {
      result = { ...parseCommand(code) };
    }
  
    return result;
  };
  
  function parseCommand(code: string) {
    const run = code;
    let isPipCommand = false;
    const isCondaCommand = hasCondaCommand(code);
    code = isCondaCodeLine(code);
  
    if (!isCondaCommand && code.includes('%pip install')) {
      code = code.replace('%pip install', '');
      isPipCommand = true;
    }
    let result: IInstallationCommandOptions = {
      channels: [],
      specs: [],
      pipSpecs: []
    };
    if ((isCondaCommand || isPipCommand) && code) {
      if (isPipCommand) {
        result = parsePipCommand(code);
      } else {
        result = parseCondaCommand(code);
      }
  
      return { install: { ...result, isPipCommand }, run: '' };
    } else {
      return { install: {}, run };
    }
  }
  
  function parseLines(codeLines: string[]): IParsedCommands {
    const installCommands: string[] = [];
    const runCommands: string[] = [];
  
    let channels: string[] = [];
    let specs: string[] = [];
    let pipSpecs: string[] = [];
    codeLines.forEach((line: string) => {
      if (hasCondaCommand(line) || hasPipCommand(line)) {
        installCommands.push(line);
      } else {
        runCommands.push(line);
      }
    });
  
    if (installCommands.length) {
      let tmpResult: IParsedCommands = {
        install: {
          channels: [],
          specs: [],
          pipSpecs: []
        },
        run: ''
      };
      installCommands.forEach((line: string) => {
        tmpResult = { ...parseCommand(line) };
        channels = tmpResult.install.channels
          ? [...channels, ...tmpResult.install.channels]
          : channels;
        specs = tmpResult.install.specs
          ? [...specs, ...tmpResult.install.specs]
          : specs;
        pipSpecs = tmpResult.install.pipSpecs
          ? [...pipSpecs, ...tmpResult.install.pipSpecs]
          : pipSpecs;
      });
    }
  
    return {
      install: { channels, specs, pipSpecs },
      run: runCommands ? runCommands.join('\n') : ''
    };
  }
  
  function isCondaCodeLine(code: string) {
    const commandNames = ['micromamba', 'un', 'mamba', 'conda', 'rattler'];
    commandNames.forEach((name: string) => {
      if (code.includes(`%${name} install`)) {
        code = code.replace(`%${name} install`, '');
      }
    });
  
    return code;
  }
  
  function hasCondaCommand(code: string) {
    let isCondaCommand = false;
    const commandNames = ['micromamba', 'un', 'mamba', 'conda', 'rattler'];
    commandNames.forEach((name: string) => {
      if (code.includes(`%${name} install`)) {
        isCondaCommand = true;
      }
    });
  
    return isCondaCommand;
  }
  
  function hasPipCommand(code: string) {
    let isPipCommand = false;
    if (code.includes('%pip install')) {
      isPipCommand = true;
    }
  
    return isPipCommand;
  }
  
  export const parseCondaCommand = (input: string) => {
    const parts = input.split(' ');
    const channels: string[] = [];
    const specs: string[] = [];
    const pipSpecs: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part) {
        const j = i + 1;
  
        if (part === '-c' && j < parts.length && !parts[j].startsWith('-')) {
          channels.push(parts[j]);
          i++;
        } else {
          specs.push(part);
        }
      }
    }
  
    return {
      channels,
      specs,
      pipSpecs
    };
  };
  
  export const parsePipCommand = (input: string) => {
    const parts = input.split(' ');
    let skip = false;
    const limits = [
      '--index-url',
      '.whl',
      'tar.gz',
      '--extra-index-url',
      'http',
      'https',
      'git',
      './',
      '-r',
      '--extra-index-url'
    ];
  
    const flags = [
      '--upgrade',
      '--pre',
      '--no-cache-dir',
      '--user',
      '--upgrade',
      '--no-deps'
    ];
  
    const pipSpecs: string[] = [];
  
    limits.map((options: string) => {
      if (input.includes(options)) {
        skip = true;
      }
    });
    if (!skip) {
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part) {
          if (!flags.includes(part)) {
            pipSpecs.push(part);
          }
        }
      }
    }
  
    return {
      channels: [],
      specs: [],
      pipSpecs
    };
  };