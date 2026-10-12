import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { MotionStudy } from './MotionStudy';
import './styles.css';

const params = new URLSearchParams(window.location.search);
createRoot(document.getElementById('root')!).render(<StrictMode>{params.has('motion-study') ? <MotionStudy /> : <App original={params.get('preview') === 'original'} />}</StrictMode>);
