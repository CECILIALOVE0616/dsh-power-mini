window.__ModuleLoader__.load({
	id: "dsh-power-mini",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var React = require("react");

		const ROUTE = "/dsh-power-mini";
		const STYLE_ID = "dsh-power-mini-style";
		const SLOT = "conversation.session.header.utilities";

		const TRIGGER_STYLE = {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			gap: "1px",
			width: "36px",
			height: "24px",
			padding: "0",
			border: "none",
			borderRadius: "6px",
			background: "transparent",
			color: "var(--dsw-alias-label-tertiary, #8a8a8a)",
			cursor: "pointer",
			transition: "background .12s ease, color .12s ease",
		};

		const POWER_ICON = "M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z";
		const CHEVRON_ICON = "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z";
		const RESTART_ICON = "M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z";
		const QUIT_ICON = "M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z";

		const ACTIONS = [
			{
				kind: "restart",
				path: "/restart",
				icon: RESTART_ICON,
				label: "重启 DSH",
				aria: "重启 DSH",
				busyTitle: "正在重启…",
				watchdogText: "新窗口没有出现，请手动重启",
				busyTail: "重启会中断它们，确定继续？",
			},
			{
				kind: "quit",
				path: "/quit",
				icon: QUIT_ICON,
				label: "退出 DSH",
				aria: "退出 DSH",
				busyTitle: "正在退出…",
				watchdogText: "窗口没有关闭，请手动退出",
				busyTail: "退出会中断它们，确定退出？",
			},
		];

		function ensureStyle() {
			if (typeof document === "undefined") return;
			if (document.getElementById(STYLE_ID) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = [
				"@keyframes dsh-power-mini-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
				".dsh-power-mini-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16));color:var(--dsw-alias-label-secondary,#c8c8c8)}",
				".dsh-power-mini-trigger[data-open=\"1\"]{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16));color:var(--dsw-alias-label-secondary,#c8c8c8)}",
				".dsh-power-mini-trigger:disabled{cursor:default;opacity:.55}",
				".dsh-power-mini-trigger[data-busy=\"1\"] .dsh-power-mini-power{animation:dsh-power-mini-spin .9s linear infinite}",
				".dsh-power-mini-trigger .dsh-power-mini-chevron{transition:transform .12s ease}",
				".dsh-power-mini-trigger[data-open=\"1\"] .dsh-power-mini-chevron{transform:rotate(180deg)}",
				".dsh-power-mini-menu{position:fixed;z-index:2147483000;min-width:172px;padding:5px;border-radius:10px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.28));background:var(--dsw-alias-bg-elevated,#1f1f22);box-shadow:0 10px 30px rgba(0,0,0,.36);font-size:13px;line-height:1.35;transition:opacity .08s ease}",
				".dsh-power-mini-item{display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary,#eaeaea);cursor:pointer;text-align:left;font:inherit}",
				".dsh-power-mini-item:hover:not(:disabled),.dsh-power-mini-item:focus-visible{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16));outline:none}",
				".dsh-power-mini-item[data-danger=\"1\"]:hover:not(:disabled),.dsh-power-mini-item[data-danger=\"1\"]:focus-visible{background:rgba(214,69,69,.20);color:var(--dsw-alias-label-danger,#ff8f8f)}",
				".dsh-power-mini-item:disabled{cursor:default;opacity:.5}",
			].join("\n");
			document.head.appendChild(style);
		}

		function icon(path, size, cls) {
			return React.createElement("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "currentColor",
				"aria-hidden": "true",
				className: cls,
			}, React.createElement("path", { d: path }));
		}

		function busyText(active) {
			const parts = [];
			if (active.agents.length > 0) parts.push(active.agents.length + " 个 agent 仍在运行");
			if (active.jobs.length > 0) parts.push(active.jobs.length + " 个后台任务仍在运行");
			return parts.join("，");
		}

		/**
		 * One compact power entry: a single header button that opens a small
		 * popover with "restart" and "quit". Both actions share the same
		 * lifecycle: check the shell is really a desktop shell, warn once when
		 * work would be interrupted, POST, then wait for the window to disappear
		 * (quit) or reappear (restart) with a watchdog so the UI can never hang.
		 */
		function PowerMenu() {
			const [open, setOpen] = React.useState(false);
			const [desktop, setDesktop] = React.useState(true);
			const [phase, setPhase] = React.useState("idle");
			const [reason, setReason] = React.useState("");
			const [activeKind, setActiveKind] = React.useState("");
			const [position, setPosition] = React.useState(null);
			const triggerRef = React.useRef(null);
			const menuRef = React.useRef(null);
			const watchdog = React.useRef(0);

			React.useEffect(() => {
				ensureStyle();
				let cancelled = false;
				fetch(ROUTE + "/status", { credentials: "same-origin" })
					.then((response) => response.json())
					.then((body) => {
						if (!cancelled) setDesktop(body.desktop !== false);
					})
					.catch(() => {});
				return () => {
					cancelled = true;
				};
			}, []);

			React.useEffect(() => () => window.clearTimeout(watchdog.current), []);

			React.useEffect(() => {
				if (open === false) return undefined;
				const onPointerDown = (event) => {
					const target = event.target;
					if (target === null) return;
					if (triggerRef.current !== null && triggerRef.current.contains(target)) return;
					if (menuRef.current !== null && menuRef.current.contains(target)) return;
					setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				const onViewport = () => setOpen(false);
				document.addEventListener("mousedown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				window.addEventListener("resize", onViewport);
				window.addEventListener("scroll", onViewport, true);
				return () => {
					document.removeEventListener("mousedown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
					window.removeEventListener("resize", onViewport);
					window.removeEventListener("scroll", onViewport, true);
				};
			}, [open]);

			React.useLayoutEffect(() => {
				if (open === false) {
					setPosition(null);
					return undefined;
				}
				const measure = () => {
					const trigger = triggerRef.current;
					if (trigger === null) return;
					const rect = trigger.getBoundingClientRect();
					const menu = menuRef.current;
					const width = menu === null ? 176 : menu.offsetWidth;
					const height = menu === null ? 92 : menu.offsetHeight;
					let left = rect.right - width;
					left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
					let top = rect.bottom + 6;
					if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
					setPosition((prev) => (prev !== null && prev.left === left && prev.top === top ? prev : { left, top }));
				};
				measure();
				const frame = window.requestAnimationFrame(measure);
				return () => window.cancelAnimationFrame(frame);
			}, [open, phase]);

			const run = React.useCallback(async (action) => {
				if (phase !== "idle") return;
				setOpen(false);
				setActiveKind(action.kind);
				setPhase("checking");
				try {
					const status = await fetch(ROUTE + "/status", { credentials: "same-origin" }).then((response) => response.json());
					if (status.desktop === false) {
						setDesktop(false);
						setPhase("idle");
						return;
					}
					let force = "";
					const active = status.active;
					if (active && active.known && (active.agents.length > 0 || active.jobs.length > 0)) {
						if (!window.confirm("还有任务在跑：" + busyText(active) + "。\n" + action.busyTail)) {
							setPhase("idle");
							return;
						}
						force = "?force=1";
					}
					setPhase("working");
					window.clearTimeout(watchdog.current);
					watchdog.current = window.setTimeout(() => {
						setReason(action.watchdogText);
						setPhase("failed");
					}, 25000);
					const response = await fetch(ROUTE + action.path + force, {
						method: "POST",
						credentials: "same-origin",
					});
					if (!response.ok) {
						const body = await response.json().catch(() => ({}));
						throw new Error((body && body.error && body.error.message) || ("HTTP " + response.status));
					}
				} catch (error) {
					window.clearTimeout(watchdog.current);
					setReason(error instanceof Error ? error.message : String(error));
					setPhase("failed");
					window.setTimeout(() => setPhase("idle"), 4000);
				}
			}, [phase]);

			const busy = phase === "working" || phase === "checking";
			const activeAction = ACTIONS.find((action) => action.kind === activeKind);
			const title = desktop === false
				? "仅在 DSH 桌面版中可用"
				: phase === "working"
					? (activeAction === undefined ? "正在处理…" : activeAction.busyTitle)
					: phase === "failed"
						? "操作失败：" + reason
						: "电源：重启 / 退出 DSH";

			const trigger = React.createElement("button", {
				type: "button",
				ref: triggerRef,
				className: "dsh-power-mini-trigger",
				style: TRIGGER_STYLE,
				disabled: busy || desktop === false,
				"data-busy": busy ? "1" : "0",
				"data-open": open ? "1" : "0",
				"aria-label": "电源菜单：重启或退出 DSH",
				"aria-haspopup": "menu",
				"aria-expanded": open ? "true" : "false",
				title,
				onClick: () => {
					if (busy) return;
					setOpen((value) => !value);
				},
			}, icon(POWER_ICON, 16, "dsh-power-mini-power"), icon(CHEVRON_ICON, 10, "dsh-power-mini-chevron"));

			const menu = open === true
				? React.createElement("div", {
					ref: menuRef,
					className: "dsh-power-mini-menu",
					role: "menu",
					style: {
						left: position === null ? -9999 : position.left,
						top: position === null ? -9999 : position.top,
						opacity: position === null ? 0 : 1,
					},
				}, ACTIONS.map((action) => React.createElement("button", {
					key: action.kind,
					type: "button",
					role: "menuitem",
					className: "dsh-power-mini-item",
					"data-danger": action.kind === "quit" ? "1" : "0",
					disabled: phase !== "idle",
					"aria-label": action.aria,
					onClick: () => {
						run(action);
					},
				}, icon(action.icon, 15), React.createElement("span", null, action.label))))
				: null;

			return React.createElement(React.Fragment, null, trigger, menu);
		}

		const inject = ["slots"];

		function apply(ctx) {
			ctx.slots.inject(SLOT, () => ctx.slots.register({
				name: SLOT,
				id: "power-mini-menu",
				order: 30,
			}, PowerMenu));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
