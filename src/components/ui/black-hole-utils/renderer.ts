export interface RendererOptions {
  canvas: HTMLCanvasElement;
}

export interface BlackHoleRenderer {
  ready: Promise<void>;
  dispose: () => void;
}

export function createRenderer({ canvas }: RendererOptions): BlackHoleRenderer {
  let disposed = false;
  let animationFrameId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;

  let resolveReady: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  // Try WebGL2, fallback to WebGL, then Canvas 2D
  let gl: WebGL2RenderingContext | WebGLRenderingContext | null =
    canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      desynchronized: true,
    }) ||
    canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      desynchronized: true,
    });

  // Vertex shader - fullscreen quad
  const vertexShader = `#version 100
    precision highp float;
    attribute vec2 position;
    varying vec2 uv;

    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Fragment shader - black hole raymarching
  const fragmentShader = `#version 100
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uMouse;
    varying vec2 uv;

    #define PI 3.14159265359
    #define MAX_STEPS 100
    #define MAX_DIST 20.0
    #define SURF_DIST 0.001

    // Schwarzschild radius (event horizon size)
    #define SCHWARZSCHILD 0.2

    // Smooth noise function
    float smoothstep(float edge0, float edge1, float x) {
      float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return t * t * (3.0 - 2.0 * t);
    }

    // Hash function for pseudo-randomness
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // Perlin-like noise
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      
      float a = hash(i + vec2(0.0, 0.0));
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    // Fractal Brownian Motion
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for(int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        p *= 2.0;
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }

    // Accretion disk rendering
    vec3 accretionDisk(vec2 pos, float radius) {
      float dist = length(pos);
      
      // Disk shape - flattened ellipse
      float diskDist = length(vec2(pos.x, pos.y * 0.3));
      
      if (diskDist < radius * 3.5) {
        // Disk color gradient
        float diskNoise = fbm(pos * 2.0 + uTime * 0.1);
        float intensity = smoothstep(radius * 0.8, radius * 3.5, diskDist) * (1.0 - diskNoise * 0.3);
        
        // Orange-red gradient
        vec3 color = mix(
          vec3(1.0, 0.8, 0.2),      // Bright yellow
          vec3(0.8, 0.2, 0.05),     // Deep red
          1.0 - diskDist / (radius * 3.5)
        );
        
        return color * intensity * 0.8;
      }
      return vec3(0.0);
    }

    // Photon ring (light ring around black hole)
    vec3 photonRing(vec2 pos) {
      float dist = length(pos);
      float photonRadius = SCHWARZSCHILD * 1.5;
      
      // Thin bright ring
      float ring = smoothstep(photonRadius + 0.05, photonRadius - 0.05, dist);
      ring *= smoothstep(photonRadius + 0.15, photonRadius, dist);
      
      return vec3(1.0, 0.9, 0.7) * ring * 1.5;
    }

    // Gravitational lensing distortion
    vec2 gravityLens(vec2 pos) {
      float dist = length(pos);
      if (dist < 0.01) return pos;
      
      // Deflection based on inverse square law
      float deflection = (SCHWARZSCHILD * 1.2) / (dist * dist + 0.01);
      return normalize(pos) * (dist - deflection * 0.3);
    }

    // Main raymarching function
    vec3 rayMarch(vec2 uv) {
      vec3 color = vec3(0.0);
      
      // Apply gravitational lensing
      vec2 lensedUv = gravityLens(uv);
      
      // Event horizon (black hole core)
      float distToCenter = length(lensedUv);
      if (distToCenter < SCHWARZSCHILD) {
        return vec3(0.0); // Pure black
      }
      
      // Photon ring
      color += photonRing(lensedUv);
      
      // Accretion disk
      color += accretionDisk(lensedUv, SCHWARZSCHILD);
      
      // Glow effect around black hole
      float glowDist = SCHWARZSCHILD * 2.5;
      float glow = exp(-distToCenter * 2.0) * 0.5;
      color += vec3(0.2, 0.15, 0.3) * glow;
      
      return color;
    }

    void main() {
      // Normalized coordinates
      vec2 fragCoord = uv * uResolution;
      vec2 p = (fragCoord - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
      
      // Mouse interaction
      vec2 mouseOffset = (uMouse - 0.5) * 0.3;
      p -= mouseOffset;
      
      // Render
      vec3 col = rayMarch(p);
      
      // Add subtle stars in background
      float stars = noise(p * 10.0) * 0.1;
      col += stars * vec3(0.5, 0.5, 0.8);
      
      // Tone mapping
      col = col / (col + 1.0);
      
      // Gamma correction
      gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
    }
  `;

  if (gl) {
    // Create shader program
    const createShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);

      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vShader = createShader(vertexShader, gl.VERTEX_SHADER);
    const fShader = createShader(fragmentShader, gl.FRAGMENT_SHADER);

    if (!vShader || !fShader) {
      console.error("Failed to compile shaders");
      const ctx = canvas.getContext("2d");
      if (ctx) fallback2D(ctx);
      resolveReady();
      return { ready, dispose };
    }

    const program = gl.createProgram();
    if (!program) {
      console.error("Failed to create program");
      fallback2D(canvas.getContext("2d")!);
      resolveReady();
      return { ready, dispose };
    }

    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      fallback2D(canvas.getContext("2d")!);
      resolveReady();
      return { ready, dispose };
    }

    gl.useProgram(program);

    // Create fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const mouseLocation = gl.getUniformLocation(program, "uMouse");

    // Mouse tracking
    let mouseX = 0.5;
    let mouseY = 0.5;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    // Resize handler
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;

      canvas.width = width;
      canvas.height = height;

      gl!.viewport(0, 0, width, height);
    };

    handleResize();

    // Setup ResizeObserver
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas);
    }

    // Animation loop
    let startTime = performance.now();

    const animate = () => {
      if (disposed) return;

      const now = performance.now();
      const elapsed = (now - startTime) * 0.001;

      gl!.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl!.uniform1f(timeLocation, elapsed);
      gl!.uniform2f(mouseLocation, mouseX, mouseY);

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", handleResize);
    animate();
    resolveReady();

    return {
      ready,
      dispose: () => {
        if (disposed) return;
        disposed = true;

        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }

        canvas.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        resizeObserver?.disconnect();

        gl?.deleteProgram(program);
        gl?.deleteShader(vShader);
        gl?.deleteShader(fShader);
        gl?.deleteBuffer(positionBuffer);
      },
    };
  }

  // Fallback: 2D Canvas
  const ctx = canvas.getContext("2d");
  if (ctx) {
    fallback2D(ctx);
  }

  resolveReady();
  return { ready, dispose };
}

// Fallback 2D rendering
function fallback2D(ctx: CanvasRenderingContext2D) {
  const canvas = ctx.canvas;
  let disposed = false;
  let animationFrameId: number | null = null;

  const render2D = () => {
    if (disposed) return;

    const w = canvas.clientWidth * (window.devicePixelRatio || 1);
    const h = canvas.clientHeight * (window.devicePixelRatio || 1);

    canvas.width = w;
    canvas.height = h;

    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.12;

    // Accretion disk
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.0, 0.35);

    const grad = ctx.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius * 3.2);
    grad.addColorStop(0, "rgba(255, 245, 220, 0.95)");
    grad.addColorStop(0.25, "rgba(255, 170, 50, 0.85)");
    grad.addColorStop(0.65, "rgba(200, 50, 15, 0.45)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Photon ring
    ctx.strokeStyle = "rgba(255, 230, 180, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Event horizon
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    animationFrameId = requestAnimationFrame(render2D);
  };

  render2D();
}
