import {Container} from "deft-react";

export function App() {
    return <Container style={{
        background: "#2a2a2a",
        color: "#FFF",
        padding: 5,
        gap: 5,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    }}>
        <Container style={{fontSize: 20}}>
            Welcome to Your Deft App
        </Container>
        <Container style={{color: '#5FD8F9'}}>
            Edit ui/app.tsx and save to reload
        </Container>
    </Container>
}
