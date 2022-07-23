import { findByProps } from "@cordwood/webpack"
import { instead } from "@cordwood/patcher"

export const onUnload = instead("sendTyping", findByProps("sendTyping"), () => {});