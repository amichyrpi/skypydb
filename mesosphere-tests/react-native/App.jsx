import { MesosphereProvider, ReactClient } from "mesosphere/reactlibrary";
import React, { StrictMode, useState } from "react";
import { FlatList, SafeAreaView, Text, TextInput, View } from "react-native";
import { callread, callwrite } from "mesosphere/reactlibrary";
import { api } from "../mesosphere/deploy";
import styles from "./styles";

function InnerApp() {
  const readmessages = callread(api.message.readMessages);

  const [newMessageText, setNewMessageText] = useState("");
  const sendMessage = callwrite(api.message.newMessage);

  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));
  async function handleSendMessage(event) {
    event.preventDefault();
    setNewMessageText("");
    await sendMessage({ body: newMessageText, user: name });
  }

  return (
    <SafeAreaView style={styles.body}>
      <Text style={styles.title}>Mesosphere Chat</Text>
      <View style={styles.name}>
        <Text style={styles.nameText} testID="NameField">
          {name}
        </Text>
      </View>
      <FlatList
        data={readmessages.slice(-10)}
        testID="MessagesList"
        renderItem={(x) => {
          const message = x.item;
          return (
            <View style={styles.messageContainer}>
              <Text>
                <Text style={styles.messageUser}>{message.user}:</Text>{" "}
                {message.body}
              </Text>
              <Text style={styles.timestamp}>
                {new Date(message._creationTime).toLocaleTimeString()}
              </Text>
            </View>
          );
        }}
      />
      <TextInput
        placeholder="Write a message…"
        style={styles.input}
        onSubmitEditing={handleSendMessage}
        onChangeText={(newText) => setNewMessageText(newText)}
        defaultValue={newMessageText}
        testID="MessageInput"
      />
    </SafeAreaView>
  );
}

const App = () => {
  const mesosphere = new ReactClient(
    process.env.EXPO_PUBLIC_MESOSPHERE_URL,
    process.env.EXPO_PUBLIC_MESOSPHERE_API_KEY,
    {
      unsavedChangesWarning: false,
    },
  );
  return (
    <StrictMode>
      <MesosphereProvider client={mesosphere}>
        <InnerApp />
      </MesosphereProvider>
    </StrictMode>
  );
};

export default App;
