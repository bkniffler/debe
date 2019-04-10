import { insertToArray } from './utils';
import { NAME, POSITION } from './constants';
import { ISkill, IOptions, IPosition, ITracker, ICallbacks } from './types';
import { dispatch } from './dispatch';

export function createFlow<T1 = any>(name?: string) {
  return new Flow<T1>(name);
}

export class Flow<T1 = any> {
  public name: string;
  private $skillSet: any = {};
  private skills: ISkill<any>[] = [];
  tracker?: ITracker;
  constructor(name = 'flow') {
    this.name = name;
  }
  public get skillsCount() {
    return this.skills.length;
  }
  public get skillCount() {
    return this.skills.length;
  }
  private appendTracker(options: IOptions = {}) {
    if (this.tracker && !options.tracker) {
      options.tracker = this.tracker;
    }
    return options;
  }
  run<T>(type: string, value?: T1, options?: IOptions, callback?: ICallbacks) {
    options = this.appendTracker(options);
    if (callback) {
      return dispatch(callback, this.skills, type, value, options);
    }
    return new Promise<T>((yay, nay) => {
      return dispatch([nay, yay], this.skills, type, value, options);
    });
  }
  runSync(type: string, value?: T1, options?: IOptions) {
    options = this.appendTracker(options);
    return dispatch(undefined, this.skills, type, value, options);
  }
  removeSkill(skill: string | ISkill) {
    skill = typeof skill === 'string' ? this.$skillSet[skill] : skill;
    const index = this.skills.indexOf(skill as any);
    if (index >= 0) {
      delete this.$skillSet[skill as any];
      this.skills.splice(this.skills.indexOf(skill as any), 1);
    }
  }
  addSkill<T = any>(
    skill: ISkill<T> | ISkill<T>[],
    position?: IPosition,
    otherSkill?: ISkill<any> | ISkill<T>[] | string | string[]
  ): void;
  addSkill<T = any>(
    name: string,
    skill: ISkill<T> | ISkill<T>[],
    position?: IPosition,
    otherSkill?: ISkill<any> | ISkill<T>[] | string | string[]
  ): void;
  addSkill<T = any>(
    n: string | ISkill<T> | ISkill<T>[] | undefined,
    s?: ISkill<T> | ISkill<T>[] | IPosition,
    p?: IPosition | ISkill<any> | ISkill<T>[],
    o?: ISkill<any> | ISkill<T>[] | string | string[]
  ): void {
    const skill = (typeof n !== 'string' ? n : s) as ISkill<T> | ISkill<T>[];
    if (!skill) {
      throw new Error('Please provide skill or name+skill');
    }
    if (Array.isArray(skill)) {
      skill.forEach(skill =>
        typeof n === 'string'
          ? this.addSkill(n as any, skill as any, p as any, o as any)
          : this.addSkill(skill as any, s as any, p as any)
      );
      return;
    }
    const name =
      (typeof n !== 'string' ? undefined : n) ||
      skill.name ||
      skill[NAME] ||
      `skill${this.skills.length}`;
    const otherSkill = ((typeof n !== 'string' ? p : o) ||
      skill['skills'] ||
      []) as ISkill<any> | ISkill<T>[] | string | string[];
    const position = ((typeof n !== 'string' ? s : p) ||
      skill[POSITION] ||
      'END') as IPosition;
    // Is already learned?
    if (this.skills.indexOf(skill) === -1 && !this.$skillSet[name]) {
      skill[NAME] = name;
      this.$skillSet[name] = skill;
      this.skills = insertToArray(
        this.skills,
        skill,
        position,
        otherSkill,
        s => this.$skillSet[s]
      );
    }
  }
}
