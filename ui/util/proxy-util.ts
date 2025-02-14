import {proxy, subscribe} from "valtio";
import {subscribeKey} from "valtio/utils";

export interface CacheOptions {
    fields: string[],
    key: string,
}

export function cachedProxy<T extends object>(initialObject?: T, cacheOptions ?: CacheOptions): T {
    const data = {...initialObject};
    const cacheFields = cacheOptions?.fields || [];
    for (const field of cacheFields) {
        const storeKey = cacheOptions.key + field;
        const cachedFieldValue = localStorage.getItem(storeKey);
        if (cachedFieldValue) {
            try {
                data[field] = JSON.parse(cachedFieldValue);
                console.log("cache loaded", storeKey, data[field]);
            } catch (error) {
                console.error('failed to parse cached field', error);
            }
        }
    }
    const obj = proxy(data);
    for (const field of cacheFields) {
        const saveCache = () => {
            const storeKey = cacheOptions.key + field;
            localStorage.setItem(storeKey, JSON.stringify(obj[field]));
            console.log("cache saved", storeKey, obj[field]);
        }
        if (typeof obj[field] == "object" && obj[field]) {
            subscribe(obj[field], saveCache);
        }
        subscribeKey(obj, field as any, saveCache);
    }
    return obj
}
