import renderer, { act } from "react-test-renderer";

jest.mock("../../../core/api/authApi", () => ({
  signIn: jest.fn(async () => ({ user: { id: "u1" } })),
  signUp: jest.fn(async () => null),
  resetPassword: jest.fn(async () => {}),
}));

import { resetPassword, signIn } from "../../../core/api/authApi";
import { AuthScreen } from "../AuthScreen";

function findByTestId(tree, testID) {
  return tree.root.findAll((node) => typeof node.type === "string" && node.props.testID === testID)[0];
}

function pressByTestId(tree, testID) {
  return tree.root.findAll(
    (node) => node.props.testID === testID && typeof node.props.onPress === "function",
  )[0];
}

beforeEach(() => jest.clearAllMocks());

async function render() {
  let tree;
  await act(async () => {
    tree = renderer.create(<AuthScreen />);
  });
  return tree;
}

describe("AuthScreen", () => {
  it("signs in with email and password", async () => {
    const tree = await render();
    await act(async () => findByTestId(tree, "auth-email").props.onChangeText("member@increment.fit"));
    await act(async () => findByTestId(tree, "auth-password").props.onChangeText("password123"));
    const button = tree.root.findAll((node) => node.props.onPress && node.props.label === "SIGN IN")[0];
    await act(async () => button.props.onPress());
    expect(signIn).toHaveBeenCalledWith("member@increment.fit", "password123");
  });

  it("requires an email before submitting", async () => {
    const tree = await render();
    const button = tree.root.findAll((node) => node.props.onPress && node.props.label === "SIGN IN")[0];
    await act(async () => button.props.onPress());
    expect(findByTestId(tree, "auth-error")).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("sends the reset email in RESET mode", async () => {
    const tree = await render();
    await act(async () => pressByTestId(tree, "auth-mode-RESET").props.onPress());
    await act(async () => findByTestId(tree, "auth-email").props.onChangeText("member@increment.fit"));
    const button = tree.root.findAll(
      (node) => node.props.onPress && node.props.label === "SEND RESET EMAIL",
    )[0];
    await act(async () => button.props.onPress());
    expect(resetPassword).toHaveBeenCalledWith("member@increment.fit");
    expect(findByTestId(tree, "auth-notice")).toBeTruthy();
  });
});
