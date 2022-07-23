import { after, injectCSS } from "@cordwood/patcher";
import { findInTree } from "@cordwood/utils";
import { findByDisplayName, findByProps } from "@cordwood/webpack";
import { React } from "@cordwood/webpack/common";
import injectStyles from "./styles.css";

const patches = [];

const MessageGroup = findByDisplayName("MessageGroup");
const Tooltip = findByDisplayName("Tooltip");

const { saveCurrentText } = findByProps("changeCurrentText");

function reply(message, channel) {
  const textArea = findInTree(document.querySelector(".channel-textarea-inner"), "_instance");

  const quoteText =
    [
      `*Sent by ${message.author.username}#${message.author.discriminator} in #${channel.name}*`,
      ...message.content.split("\n"),
    ]
      .map((s) => "> " + s)
      .join("\n") +
    "\n" +
    textArea.getValue();

  textArea.setValue(quoteText);
  saveCurrentText(channel.id, quoteText);
}

patches.push(injectStyles());

after(
  "render",
  MessageGroup.prototype,
  (args, res) => {
    const Message = findInTree(res, (t) => t?.displayName === "Message");

    const unpatch = after("render", Message.prototype, function (args, ret) {
      const messageActions = findInTree(
        ret,
        // (t) => Array.isArray(t) && t?.some((i) => i?.type?.displayName === "Popout"),
        (t) => t?.className === "message-text",
      ).children;

      messageActions.splice(
        messageActions.findIndex((a) =>
          a?.props?.subscribeTo?.startsWith("TOGGLE_REACTION_POPOUT_"),
        ),
        0,
        <Tooltip text="Reply">
          <svg
            className="btn-reply"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            onClick={() => reply(this.props.message, this.props.channel)}>
            <path
              d="M10 8.26667V4L3 11.4667L10 18.9333V14.56C15 14.56 18.5 16.2667 21 20C20 14.6667 17 9.33333 10 8.26667Z"
              fill="currentColor"></path>
          </svg>
        </Tooltip>,
      );
    });
    patches.push(unpatch);
  },
  true,
);

export const onUnload = () => _.forEachRight(patches, (p) => p());
