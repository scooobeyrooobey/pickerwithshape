import { useEffect, useRef } from 'react';
import { vertexSrc, fragmentSrc } from './shaders';
import styles from './Sphere.module.css';

interface SphereProps {
  /** continuous mode in [0..1]: 0=purple awful, 0.25=indigo meh, 0.5=blue okay, 0.75=green good, 1=peach amazing */
  value: number;
}

export function Sphere({ value }: SphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // value is read every frame from a ref so the GL loop survives prop changes
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!gl) {
      console.error('WebGL2 is not supported in this browser');
      return;
    }

    const compile = (type: number, src: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, vertexSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uPhase = gl.getUniformLocation(program, 'uPhase');
    const uMode = gl.getUniformLocation(program, 'uMode');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let raf = 0;
    let lastT = performance.now();
    const start = lastT;

    // mode is the eased version of value; phase is tempo-integrated time
    let mode = valueRef.current;
    let phase = 0;

    const render = () => {
      resize();

      const now = performance.now();
      const dt = (now - lastT) * 0.001;
      lastT = now;

      const target = valueRef.current;
      mode += (target - mode) * 0.05;

      // Tempo curve: Awful (0) crawls at 0.225 — half of Amazing's 0.45.
      // From Meh (0.25) onward use the original ramp 1.05 → 0.45.
      const tempo = mode < 0.25
        ? 0.225 + (0.9 - 0.225) * (mode / 0.25)
        : 1.05 + (0.45 - 1.05) * mode;
      phase += dt * tempo;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) * 0.001);
      gl.uniform1f(uPhase, phase);
      gl.uniform1f(uMode, mode);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(vbo);
    };
  }, []);

  return (
    <div className={styles.wrap} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
