import React, {useContext, useState} from 'react'
import {
    addSource, clearTasks, setOutput, Task, updateTask,
    useAppStoreSnapshot
} from "./app-store";
import {Button, Container, Entry, Label, OptionItem, PageContext, Row, Scroll, Select} from "deft-react";
import {getFileName} from "./util/file-util";
import TaskStatusIcon from "./components/task-status-icon";

const App = () => {
    const appStore = useAppStoreSnapshot();
    const [format, setFormat] = useState("mp4");
    const [size, setSize] = useState(0);
    const pageContext = useContext(PageContext);

    const taskEls = appStore.tasks.map((it, idx) => {
        const progress = it.progress?.toFixed(2) || "";
        const cellStyle = {
            borderBottom: '1 #555',
        }
        const progressBar = it.status != 'processing' ? null : <Row style={{
            height: '70%',
            width: '100%',
            background: '#444',
        }}>
            <Container style={{
                background: '#0060A4AA',
                width: progress + '%',
            }} />
        </Row>

        const progressLabel = it.status === "processing" ? `${progress}%` : '';

        return <Row key={idx}>
            <Row style={{...cellStyle, flex: 1, position: 'relative', padding: '0 3'}}>
                <Row style={{flex: 1,padding: '2 4', justifyContent: 'space-between', position: 'relative'}}>
                    {getFileName(it.source)}
                </Row>
                <Row style={{width: 80, alignItems: 'center', justifyContent: 'flex-start', position: 'relative'}}>
                    {progressBar}
                    <Row style={{position: 'absolute', justifyContent: 'flex-end', width: '100%'}} >
                        <TaskStatusIcon status={it.status} label={progressLabel} />
                    </Row>
                </Row>
            </Row>
            {/*<Container style={{...cellStyle, flex: 1}}>*/}
            {/*    <Entry text={it.outName} onTextChange={updateOutName} />*/}
            {/*</Container>*/}
        </Row>
    })

    const taskWrapper = <Container style={{
        padding: '0',
        borderRadius: 8,
    }}>
        {taskEls}
    </Container>

    async function onAddFile() {
        try {
            //@ts-ignore
            const files = await fileDialog.show({
                dialogType: "multiple",
                window: pageContext.window,
            });
            // console.log({files})
            files.sort();
            for (const f of files) {
                addSource(f);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function onSelectOutDir() {
        //@ts-ignore
        const dirs = await fileDialog.show({
            dialogType: "dir",
            window: pageContext.window,
        })
        if (dirs.length) {
            setOutput(dirs[0]);
        }
    }

    async function processTask(task: Task) {
        if (task.status == "finished") {
            return;
        }
        updateTask(task.id, {status: "processing"});
        let outPath = appStore.output + "/" + task.outName + "." + format;
        console.log(`converting ${task.source} => ${outPath}`);
        return new Promise<void>(resolve => {
            try {
                const options: FFmpegConvertOptions = {
                    inputFile: task.source,
                    outputFile: outPath,
                    outputHeight: size,
                }
                ffmpeg_convert(options, (status, param) => {
                    if (status === "progress") {
                        updateTask(task.id, {progress: (param / 100)});
                    } else if (status === "error") {
                        console.log(param);
                        updateTask(task.id, {status: "failed"});
                        resolve();
                    } else if (status === "end") {
                        updateTask(task.id, {status: "finished", progress: 100});
                        resolve();
                    }
                });
            } catch (error) {
                updateTask(task.id, {status: "failed"});
                resolve();
            }
        })
    }

    async function onStartConvert() {
        if (!appStore.tasks?.length) {
            let _ = pageContext.window.toast("No video files");
            return;
        }
        if (!appStore.output) {
            let _ = pageContext.window.toast("Output directory is unspecified");
            return;
        }
        for (const t of appStore.tasks) {
            console.log(`converting ${t.source}`);
            await processTask(t);
        }
    }

    async function onClear() {
        clearTasks();
    }


    const outFormats: OptionItem<string>[] = [
        {label: "mp4", value: "mp4"},
        {label: "mkv", value: "mkv"},
        {label: "flv", value: "flv"},
        {label: "avi", value: "avi"},
        // {label: "webm", value: "webm"},
        {label: "mov", value: "mov"},
        {label: "wmv", value: "wmv"},
    ]

    const outSizes: OptionItem<number>[] = [
        {label: "Original", value: 0},
        {label: "360P", value: 360},
        {label: "480P", value: 480},
        {label: "720P", value: 720},
        {label: "1080P", value: 1080},
    ]

    return <Container style={{flex: 1, color: "#F1F1F1", background: '#31363B'}}>
        <Container style={{padding: '10'}}>
            <Row style={{justifyContent: 'space-between', gap: 10, alignItems: 'center'}}>
                <Label text="Output path:" />
                <Entry style={{flex: 1, height: 24, background: '#1B1E20', borderRadius: 4}} text={appStore.output} />
                <Button title="Select..." onClick={onSelectOutDir} />
            </Row>
            <Row style={{gap: 10}}>
                <Row style={{gap: 10}}>
                    <Label text="Output format:" />
                    <Select options={outFormats} value={format} onChange={setFormat} />
                </Row>
                <Row style={{gap: 10}}>
                    <Label text="Output size：" />
                    <Select options={outSizes} value={size} onChange={setSize} />
                </Row>
            </Row>
        </Container>
        <Scroll style={{flex: 1, background: '#1E1F22', margin: '0 4'}} >
            {taskWrapper}
        </Scroll>
        <Row style={{justifyContent: 'space-between', padding: '10', background: '#3C3F41'}}>
            <Row>
                <Button title="Add Videos..." onClick={onAddFile} />
                <Button title="Clear" onClick={onClear} />
            </Row>
            <Button title="Start Convert" onClick={onStartConvert} />
        </Row>
    </Container>

}

export default App
