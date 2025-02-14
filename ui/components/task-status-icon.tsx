import {TaskStatus} from "../app-store";
import {Image, Label, Row} from "deft-react";

export interface TaskStatusIconProps {
    status: TaskStatus,
    label?: string,
}

export default function TaskStatusIcon(props: TaskStatusIconProps) {
    // const status = 'processing' as TaskStatus;// props.status;
    const status = props.status;
    let img;
    let color = "#999";
    let extraStyles = {};
    if (status === "finished") {
        color = "#32bb32";
        img = require("../assets/success.svg");
    } else if (status === "failed") {
        img = require("../assets/fail.svg");
        color = "#910c0c"
    } else if (status === "processing") {
        // img = require("../../assets/runing.svg");
        // extraStyles = {
        //     animationName: "rotate",
        //     animationDuration: 2000,
        //     animationIterationCount: Infinity,
        // }
    }
    const style = {
        color,
        padding: '0 8',
        // background: '#000',
    }
    return <Row style={style}>
        {!!img && <Image src={img} style={{...extraStyles, width: 20, height: 20}}/>}
        {props.label && <Label text={props.label} />}
    </Row>
}