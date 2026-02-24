import { useEffect, useRef } from 'react';

/**
 * 环境背景粒子动画组件
 * 使用 EaselJS 和 GSAP 创建粒子效果
 */
export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any>(null);

  useEffect(() => {
    // 动态加载必需的库
    const loadScripts = async () => {
      // 加载 EaselJS
      if (!(window as any).createjs) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://code.createjs.com/1.0.0/easeljs.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
      }

      // 加载 GSAP (TweenMax)
      if (!(window as any).TweenMax) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/2.1.3/TweenMax.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
      }

      // 初始化粒子引擎
      initParticles();
    };

    const initParticles = () => {
      if (!canvasRef.current || !(window as any).createjs || !(window as any).TweenMax) return;

      const createjs = (window as any).createjs;
      const TweenMax = (window as any).TweenMax;
      const Cubic = (window as any).Cubic;

      // ParticleEngine 类定义
      function ParticleEngine(canvas_id: string) {
        if (!(this instanceof ParticleEngine)) {
          return new (ParticleEngine as any)(canvas_id);
        }

        const _ParticleEngine = this as any;

        this.canvas_id = canvas_id;
        this.stage = new createjs.Stage(canvas_id);
        const canvasElement = document.getElementById(canvas_id) as HTMLCanvasElement;
        this.totalWidth = this.canvasWidth = canvasElement.width = canvasElement.offsetWidth;
        this.totalHeight = this.canvasHeight = canvasElement.height = canvasElement.offsetHeight;
        this.compositeStyle = 'lighter';

        this.particleSettings = [
          { id: 'small', num: 100, fromX: 0, toX: this.totalWidth, ballwidth: 3, alphamax: 0.4, areaHeight: 0.5, color: '#0cdbf3', fill: false },
          { id: 'medium', num: 50, fromX: 0, toX: this.totalWidth, ballwidth: 15, alphamax: 0.3, areaHeight: 1, color: '#6fd2f3', fill: true },
          { id: 'large', num: 30, fromX: 0, toX: this.totalWidth, ballwidth: 30, alphamax: 0.2, areaHeight: 1, color: '#93e9f3', fill: true }
        ];
        this.particleArray = [];
        this.lights = [];

        this.stage.compositeOperation = _ParticleEngine.compositeStyle;

        function drawParticles() {
          for (let i = 0, len = _ParticleEngine.particleSettings.length; i < len; i++) {
            const ball = _ParticleEngine.particleSettings[i];

            for (let s = 0; s < ball.num; s++) {
              const circle = new createjs.Shape();
              if (ball.fill) {
                circle.graphics.beginFill(ball.color).drawCircle(0, 0, ball.ballwidth);
                const blurFilter = new createjs.BlurFilter(ball.ballwidth / 2, ball.ballwidth / 2, 1);
                circle.filters = [blurFilter];
                const bounds = blurFilter.getBounds();
                circle.cache(-50 + bounds.x, -50 + bounds.y, 100 + bounds.width, 100 + bounds.height);
              } else {
                circle.graphics.beginStroke(ball.color).setStrokeStyle(1).drawCircle(0, 0, ball.ballwidth);
              }

              circle.alpha = range(0, 0.1);
              circle.alphaMax = ball.alphamax;
              circle.distance = ball.ballwidth * 2;
              circle.ballwidth = ball.ballwidth;
              circle.flag = ball.id;
              circle.areaHeight = ball.areaHeight;
              _ParticleEngine.applySettings(circle, ball.fromX, ball.toX, ball.areaHeight);
              circle.speed = range(2, 10);
              circle.y = circle.initY;
              circle.x = circle.initX;
              circle.scaleX = circle.scaleY = range(0.3, 1);

              _ParticleEngine.stage.addChild(circle);

              animateBall(circle);

              _ParticleEngine.particleArray.push(circle);
            }
          }
        }

        this.applySettings = function (circle: any, positionX: number, totalWidth: number, areaHeight: number) {
          circle.speed = range(1, 3);
          circle.initY = weightedRange(0, _ParticleEngine.totalHeight, 1, [_ParticleEngine.totalHeight * (2 - areaHeight / 2) / 4, _ParticleEngine.totalHeight * (2 + areaHeight / 2) / 4], 0.8);
          circle.initX = weightedRange(positionX, totalWidth, 1, [positionX + ((totalWidth - positionX)) / 4, positionX + ((totalWidth - positionX)) * 3 / 4], 0.6);
        };

        function animateBall(ball: any) {
          const scale = range(0.3, 1);
          const xpos = range(ball.initX - ball.distance, ball.initX + ball.distance);
          const ypos = range(ball.initY - ball.distance, ball.initY + ball.distance);
          const speed = ball.speed;
          TweenMax.to(ball, speed, { scaleX: scale, scaleY: scale, x: xpos, y: ypos, onComplete: animateBall, onCompleteParams: [ball], ease: Cubic.easeInOut });
          TweenMax.to(ball, speed / 2, { alpha: range(0.1, ball.alphaMax), onComplete: fadeout, onCompleteParams: [ball, speed] });
        }

        function fadeout(ball: any, speed: number) {
          ball.speed = range(2, 10);
          TweenMax.to(ball, speed / 2, { alpha: 0 });
        }

        function range(min: number, max: number) {
          return min + (max - min) * Math.random();
        }

        function weightedRange(to: number, from: number = 0, decimalPlaces: number = 0, weightedRange: [number, number] | null = null, weightStrength: number = 0) {
          let ret;
          if (to === from) return to;

          if (weightedRange && Math.random() <= weightStrength) {
            ret = round(Math.random() * (weightedRange[1] - weightedRange[0]) + weightedRange[0], decimalPlaces);
          } else {
            ret = round(Math.random() * (to - from) + from, decimalPlaces);
          }
          return ret;
        }

        function round(num: number, precision: number) {
          const decimal = Math.pow(10, precision);
          return Math.round(decimal * num) / decimal;
        }

        drawParticles();
      }

      (ParticleEngine as any).prototype.render = function () {
        this.stage.update();
      };

      (ParticleEngine as any).prototype.resize = function () {
        const canvasElement = document.getElementById(this.canvas_id) as HTMLCanvasElement;
        this.totalWidth = this.canvasWidth = canvasElement.width = canvasElement.offsetWidth;
        this.totalHeight = this.canvasHeight = canvasElement.height = canvasElement.offsetHeight;
        this.render();

        for (let i = 0, length = this.particleArray.length; i < length; i++) {
          this.applySettings(this.particleArray[i], 0, this.totalWidth, this.particleArray[i].areaHeight);
        }

        for (let j = 0, len = this.lights.length; j < len; j++) {
          this.lights[j].elem.initY = this.totalHeight / 2 + this.lights[j].offsetY;
          this.lights[j].elem.initX = this.totalWidth / 2 + this.lights[j].offsetX;
          TweenMax.to(this.lights[j].elem, 0.5, { x: this.lights[j].elem.initX, y: this.lights[j].elem.initY });
        }
      };

      // 初始化粒子引擎
      particlesRef.current = new (ParticleEngine as any)('ambient-canvas');

      // 更新画布
      createjs.Ticker.addEventListener('tick', updateCanvas);

      function updateCanvas() {
        if (particlesRef.current) {
          particlesRef.current.render();
        }
      }

      // 监听窗口大小变化
      const handleResize = () => {
        if (particlesRef.current) {
          particlesRef.current.resize();
        }
      };

      window.addEventListener('resize', handleResize, false);

      return () => {
        createjs.Ticker.removeEventListener('tick', updateCanvas);
        window.removeEventListener('resize', handleResize);
      };
    };

    loadScripts();

    return () => {
      // 清理
      if (particlesRef.current && (window as any).createjs) {
        (window as any).createjs.Ticker.removeAllEventListeners();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="ambient-canvas"
      className="ambient-background-canvas"
    >
      Your browser does not support the Canvas element.
    </canvas>
  );
}
