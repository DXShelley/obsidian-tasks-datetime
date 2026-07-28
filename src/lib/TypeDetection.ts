/**
 * Return a string representation of the {@link value}'s type, for showing to users, such as in error messages.
 * @param value
 */
export function getValueType(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    const type = typeof value;
    if (value !== null && type === 'object') {
        const prototype = Object.getPrototypeOf(value) as object | null;
        if (prototype === null) {
            return 'Object';
        }

        const constructor = Reflect.get(prototype, 'constructor') as unknown;
        if (typeof constructor === 'function' && typeof constructor.name === 'string') {
            return constructor.name;
        }

        return 'Object';
    }

    return type;
}
