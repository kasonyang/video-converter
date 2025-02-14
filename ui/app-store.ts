import {useSnapshot} from "valtio";
import {getFileName, removeExt} from "./util/file-util";
import {cachedProxy} from "./util/proxy-util";

export type TaskStatus = 'pending' | 'processing' | 'finished' | 'failed'

let _nextTaskId = 1;

export interface Task {
    id: number;
    source: string;
    outName: string;
    status: TaskStatus;
    progress: number;
}

const appStore = cachedProxy({
    output: "",
    tasks: [] as Task[],
}, {
    fields: ["output"],
    key: 'format-convert'
});

function getTaskById(taskId: number): Task | null {
    return appStore.tasks.find(it => it.id == taskId);
}

export function updateTask(taskId: number, data: { status?: TaskStatus, progress?: number, outName ?: string }) {
    const task = getTaskById(taskId);
    if (task) {
        if (typeof data.status !== "undefined") {
            task.status = data.status;
        }
        if (typeof data.progress !== "undefined") {
            task.progress = data.progress;
        }
        if (typeof data.outName !== "undefined") {
            task.outName = data.outName;
        }
    }
}

export function clearTasks() {
    appStore.tasks.length = 0;
}

export function setOutput(output) {
    appStore.output = output;
}

export function addSource(source: string) {
    const outName = removeExt(getFileName(source));
    appStore.tasks.push({
        id: _nextTaskId++,
        source,
        outName,
        status: 'pending',
        progress: 0,
    })
}


export function useAppStoreSnapshot() {
    const snapshot = useSnapshot(appStore);
    return {
        ...snapshot,
    }
}
