import "./app.css"
import React, {useContext, useState} from 'react'
import {
    addSource, clearTasks, setOutput, Task, updateTask,
    useAppStoreSnapshot
} from "./app-store";
import {Button, Container, Entry, Label, PageContext, Row, Scroll, Select} from "deft-react";
import {getFileName} from "./util/file-util";
import TaskStatusIcon from "./components/task-status-icon";

const App = () => {
    const appStore = useAppStoreSnapshot();
    const [format, setFormat] = useState("mp4");
    const [size, setSize] = useState("0");
    const pageContext = useContext(PageContext);
    const [converting, setConverting] = useState(false);

    function onFormatChange(e: IVoidEvent) {
        const target = e.target as SelectElement;
        setFormat(target.value);
    }

    function onSizeChange(e: IVoidEvent) {
        const target = e.target as SelectElement;
        setSize(target.value);
    }

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
                    outputHeight: Number(size),
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
            pageContext.window.showAlert("No video files");
            return;
        }
        if (!appStore.output) {
            let _ = pageContext.window.showAlert("Output directory is unspecified");
            return;
        }
        setConverting(true);
        try {
            for (const t of appStore.tasks) {
                console.log(`converting ${t.source}`);
                await processTask(t);
            }
        } finally {
            setConverting(false);
        }
    }

    async function onClear() {
        clearTasks();
    }


    const outFormats: SelectOption[] = [
        {label: "mp4", value: "mp4"},
        {label: "mkv", value: "mkv"},
        {label: "flv", value: "flv"},
        {label: "avi", value: "avi"},
        // {label: "webm", value: "webm"},
        {label: "mov", value: "mov"},
        {label: "wmv", value: "wmv"},
    ]

    const outSizes: SelectOption[] = [
        {label: "Original", value: "0"},
        {label: "360P", value: "360"},
        {label: "480P", value: "480"},
        {label: "720P", value: "720"},
        {label: "1080P", value: "1080"},
    ]

    return <Container style={{flex: 1}}>
        <Container style={{padding: '10'}}>
            <Row style={{justifyContent: 'space-between', gap: 10, alignItems: 'center'}}>
                <Label text="Output path:" />
                <Entry style={{flex: 1}} text={appStore.output} />
                <Button title="Select..." onClick={onSelectOutDir} />
            </Row>
            <Row style={{gap: 10, alignItems: 'center', padding: '10 0'}}>
                <Row style={{gap: 10, alignItems: 'center'}}>
                    <Label text="Output format:" />
                    <Select  style={{width: '6em'}}  options={outFormats} value={format} onChange={onFormatChange} />
                </Row>
                <Row style={{gap: 10, alignItems: 'center'}}>
                    <Label text="Output size：" />
                    <Select  style={{width: '8em'}}  options={outSizes} value={size + ""} onChange={onSizeChange} />
                </Row>
            </Row>
        </Container>
        <Scroll style={{flex: 1, background: '#1E1F22', margin: '0 4'}} >
            {taskWrapper}
        </Scroll>
        <Row style={{justifyContent: 'space-between', padding: '10'}}>
            <Row style={{gap: 10}}>
                <Button title="Add Videos..." onClick={onAddFile} />
                <Button title="Clear" onClick={onClear} />
            </Row>
            <Button onClick={onStartConvert} disabled={converting}>
                Start Convert
            </Button>
        </Row>
    </Container>

}

export default App
