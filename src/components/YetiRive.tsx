"use client";

import { useEffect, useRef } from "react";

const STATE_MACHINE_NAME = "State Machine 1";

interface YetiRiveProps {
  emailLength: number;
  handsUp: boolean;
  onRiveReady?: (controls: {
    triggerSuccess: () => void;
    triggerFail: () => void;
  }) => void;
}

export default function YetiRive({ emailLength, handsUp, onRiveReady }: YetiRiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveRef = useRef<any>(null);
  const inputsRef = useRef<any>({});

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    import("@rive-app/canvas").then(({ Rive, StateMachineInput }) => {
      if (cancelled || !canvasRef.current) return;

      const r = new Rive({
        src: "/520-990-teddy-login-screen.riv",
        canvas: canvasRef.current!,
        autoplay: true,
        stateMachines: STATE_MACHINE_NAME,
        onLoad: () => {
          r.resizeDrawingSurfaceToCanvas();
          const inputs = r.stateMachineInputs(STATE_MACHINE_NAME);
          const map: any = {};
          inputs?.forEach((inp: any) => { map[inp.name] = inp; });
          inputsRef.current = map;

          onRiveReady?.({
            triggerSuccess: () => map["success"]?.fire(),
            triggerFail: () => map["fail"]?.fire(),
          });
        },
      });

      riveRef.current = r;
    }).catch(console.error);

    return () => {
      cancelled = true;
      riveRef.current?.cleanup?.();
    };
  }, []);

  // Controlar manos
  useEffect(() => {
    const inp = inputsRef.current["hands_up"];
    if (inp) inp.value = handsUp;
  }, [handsUp]);

  // Controlar mirada
  useEffect(() => {
    const look = inputsRef.current["Look"];
    const check = inputsRef.current["Check"];
    if (!look || !check || handsUp) return;
    check.value = true;
    look.value = Math.round((emailLength / 41) * 100 - 25);
  }, [emailLength, handsUp]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={280}
      style={{ width: 280, height: 280 }}
    />
  );
}