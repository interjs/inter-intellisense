type refValueType = string | number | null | void;
type refMethods<R> = {
  setRefs: R;
  observe(
    ref: string,
    value: refValueType,
    previousValue: refValueType
  ): boolean;
};

interface refOptionsInterface<T> {
  in: string;
  data: T;
}

export declare function Ref<T extends object>(
  options: refOptionsInterface<T>
): refMethods<T> & T;
