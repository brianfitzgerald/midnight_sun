import * as React from "react"
import {
  Platform,
  StyleSheet,
  Text,
  ScrollView,
  StatusBar,
  View,
  ScrollViewProps,
  ScrollViewStatic,
  Button,
  TextInput,
  ViewStyle,
  TouchableOpacity,
  TextStyle
} from "react-native"
import Swipeout from "react-native-swipeout"

import { containerStyle, titleInput } from "../styles/commonStyles"
import HeroButton, { LightHeroButton } from "../components/HeroButton"
import colors from "../styles/colors"

import { dbInstance } from "../firebaseRef"
import { Story, StoryOption, StoryAction, StoryState, emptyStory } from "../types/Story"
import { Player } from "../types/Player"
import { getNextActionIndex, doAction, getActionByIndex } from "../actions/Story"
import { RoomState, FirebaseRoomState } from "../types/Network"
import { roomDefaultState, updateRoomState } from "../firebaseFunctions"
import StoryListItem from "../components/StoryListItem"
import { updateStory } from "../actions/StoryDB"
import StoryActionInput, {
  PromptButtonBaseStyle,
  PromptButtonTextStyle,
  OptionButtonBaseStyle,
  OptionButtonTextStyle
} from "../components/StoryActionInput"
import { appStore } from "../stores/AppStore"
import { buildStory } from "../actions/storyBuilder"
import { uuidv4 } from "../utils"
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view"

type StoryBuilderProps = {}

type StoryBuilderState = {
  hasMadeChanges: boolean
  story: Story
  filterModeActive: boolean
  filterModeTargetIndex: number
  filterPairs: FilterPair[]
}

export type FilterPair = {
  actionIndex: number
  optionIndex: number
  targetIndex: number
  filterBooleanValue: boolean
}

export default class StoryBuilderView extends React.Component<StoryBuilderProps, StoryBuilderState> {
  constructor(props: StoryBuilderProps) {
    super(props)

    console.log(!appStore.currentStory)
    const initialStory = appStore.currentStory ? appStore.currentStory : emptyStory

    this.state = {
      story: initialStory,
      filterModeTargetIndex: 0,
      filterModeActive: false,
      filterPairs: [],
      hasMadeChanges: false
    }
  }

  setDescription(value: string) {
    this.setState({
      story: { ...this.state.story, description: value },
      hasMadeChanges: true
    })
  }

  setTitle(value: string) {
    this.setState({
      story: { ...this.state.story, title: value },
      hasMadeChanges: true
    })
  }

  addAction() {
    const newAction: StoryAction = {
      prompt: "",
      options: []
    }
    const newActions = this.state.story.actions.concat(newAction)
    this.setState({
      story: { ...this.state.story, actions: newActions },
      hasMadeChanges: true
    })
  }

  removeActionPrompt(actionIndex: number) {
    const newActions = this.state.story.actions
    newActions.splice(actionIndex, 1)
    this.setState({
      story: { ...this.state.story, actions: newActions }
    })
  }

  removeActionOption(actionIndex: number, optionIndex: number) {
    const newActions = this.state.story.actions
    newActions[actionIndex].options.splice(optionIndex, 1)
    this.setState({
      story: { ...this.state.story, actions: newActions }
    })
  }

  addOption(actionIndex: number) {
    const newOption: StoryOption = {
      title: ""
    }
    const newActions = this.state.story.actions
    newActions[actionIndex].options.push(newOption)
    this.setState({
      story: { ...this.state.story, actions: newActions },
      hasMadeChanges: true
    })
  }

  updateActionPrompt(actionIndex: number, value: string) {
    const newActions = this.state.story.actions
    newActions[actionIndex].prompt = value
    this.setState({ story: { ...this.state.story, actions: newActions } })
  }

  updateActionOption(actionIndex: number, optionIndex: number, value: string) {
    const newActions = this.state.story.actions
    newActions[actionIndex].options[optionIndex].title = value
    this.setState({ story: { ...this.state.story, actions: newActions } })
  }

  enterFilterMode(actionIndex: number, optionIndex: number) {
    if (!optionIndex) {
      this.setState({
        filterModeActive: true,
        filterModeTargetIndex: actionIndex
      })
    }
  }

  leaveFilterMode() {
    this.setState({ filterModeActive: false, filterModeTargetIndex: 0 })
  }

  updateStory(publish: boolean, exit: boolean = true) {
    const formattedStory = this.state.story

    formattedStory.author = appStore.playerName
    if (formattedStory.id === "") {
      formattedStory.id = uuidv4()
    }
    formattedStory.published = publish

    const builtStory = buildStory(this.state.story, this.state.filterPairs)

    builtStory.actions.forEach(action => {
      if (action.options.length < 1) {
        alert("Make sure every action has at least one option.")
        return
      }
    })

    if (builtStory.actions.length === 0) {
      alert("Add an action to your story first.")
      return
    }

    if (builtStory.title === "") {
      alert("Your story needs a title.")
      return
    }

    if (builtStory.description === "") {
      alert("You need to add a description to your story.")
      return
    }

    if (this.state.hasMadeChanges) {
      updateStory(builtStory, false)
        .then(() => {
          if (publish) {
            alert("Congratulations! Your story has been published.")
          }
          if (exit) {
            appStore.leaveStoryBuilder()
          }
        })
        .catch(err => console.log(err))
    } else {
      if (exit) {
        appStore.leaveStoryBuilder()
      }
    }
  }

  testStory() {
    appStore.enterSingleplayer(this.state.story, true)
  }

  updateActionFilterSelection(actionIndex: number, optionIndex: number, targetIndex: number) {
    const newFilterState = this.state.filterPairs
    const existingFilterIndex = newFilterState.findIndex(
      f => f.optionIndex === optionIndex && f.actionIndex === actionIndex && f.targetIndex === targetIndex
    )

    if (existingFilterIndex === -1) {
      const newFilter: FilterPair = {
        actionIndex,
        optionIndex,
        targetIndex,
        filterBooleanValue: true
      }
      newFilterState.push(newFilter)
    } else if (existingFilterIndex !== -1) {
      const currentValue = newFilterState[existingFilterIndex].filterBooleanValue
      if (currentValue === false) {
        newFilterState.splice(existingFilterIndex, 1)
      } else {
        newFilterState[existingFilterIndex].filterBooleanValue = !newFilterState[existingFilterIndex].filterBooleanValue
      }
    }
    this.setState({ filterPairs: newFilterState })
  }

  render() {
    if (this.state.filterModeActive) {
      const targetIndex = this.state.filterModeTargetIndex
      const target = this.state.story.actions[targetIndex]
      const newFilter = this.state.filterPairs
      const validActionsToFilterBy = this.state.story.actions.filter((a, i) => i !== targetIndex)
      return (
        <View style={containerStyle}>
          <StatusBar backgroundColor={colors.black} barStyle="light-content" />
          <View style={topBarStyle}>
            <Button title="Done" color={colors.white} onPress={this.leaveFilterMode.bind(this)} />
          </View>
          <Text style={{ color: colors.white, textAlign: "left" }}>Target</Text>
          <StoryActionInput
            value={target.prompt}
            onChange={this.updateActionPrompt.bind(this, targetIndex)}
            hasFilter={target.filter !== undefined && Object.keys(target.filter).length > 0}
            suppressFilterIcon={true}
            onFilterPressed={this.enterFilterMode.bind(this, targetIndex)}
            inputType="prompt"
          />
          <Text style={{ color: colors.white, textAlign: "left" }}>Filtering Options</Text>
          <KeyboardAwareScrollView>
            {validActionsToFilterBy.map((action, i) => (
              <View key={i}>
                <View style={PromptButtonBaseStyle}>
                  <Text style={PromptButtonTextStyle}>{action.prompt}</Text>
                </View>
                {action.options
                  ? action.options.map((action, k) => {
                      const isInFilter = newFilter.find(f => f.optionIndex === k && f.actionIndex === i)
                      return (
                        <View>
                          {isInFilter ? (
                            <Text style={FilterLabelStyle}>
                              {isInFilter.filterBooleanValue ? "Selected" : "Not Selected"}
                            </Text>
                          ) : null}
                          <TouchableOpacity onPress={this.updateActionFilterSelection.bind(this, i, k, targetIndex)}>
                            <View style={OptionButtonBaseStyle}>
                              <Text style={OptionButtonTextStyle}>{action.title}</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )
                    })
                  : null}
              </View>
            ))}
          </KeyboardAwareScrollView>
        </View>
      )
    }

    const hasMadeChanges = this.state.hasMadeChanges || (this.state.story.id !== "" && this.state.story.title !== "")

    return (
      <View style={containerStyle}>
        <StatusBar backgroundColor={colors.black} barStyle="light-content" />
        <KeyboardAwareScrollView>
          <View style={topBarStyle}>
            <View style={topButtonStyle}>
              <Button
                title={this.state.hasMadeChanges ? "Save and Exit" : "Exit"}
                color={colors.white}
                onPress={() => (this.state.hasMadeChanges ? this.updateStory(false) : appStore.leaveStoryBuilder())}
              />
            </View>
            <View style={topButtonStyle}>
              {hasMadeChanges ? <Button title="Test" color={colors.white} onPress={this.testStory.bind(this)} /> : null}
            </View>
          </View>
          <View style={topBarStyle}>
            <View style={topButtonStyle}>
              <Button
                title="Show Tutorial"
                color={colors.white}
                onPress={() => alert("Sorry, we're hard at work at filming this. Come back soon!")}
              />
            </View>
            <View style={topButtonStyle}>
              {hasMadeChanges ? (
                <Button title="Publish" color={colors.white} onPress={() => this.updateStory(true)} />
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: "column" }}>
            <TextInput
              placeholder="Enter a title"
              value={this.state.story.title || ""}
              onChange={value => this.setTitle(value.nativeEvent.text)}
              placeholderTextColor={colors.grey}
              style={titleInput}
            />
            <TextInput
              placeholder="Enter a description for your story"
              placeholderTextColor={colors.grey}
              value={this.state.story.description || ""}
              onChange={value => this.setDescription(value.nativeEvent.text)}
              style={styles.nameInput}
            />
            {this.state.story.actions.map((action, i) => (
              <View key={i}>
                <Swipeout
                  backgroundColor={colors.black}
                  right={[
                    {
                      text: "Remove",
                      onPress: this.removeActionPrompt.bind(this, i),
                      backgroundColor: "#FE3A2F"
                    }
                  ]}
                >
                  <StoryActionInput
                    value={action.prompt}
                    onChange={this.updateActionPrompt.bind(this, i)}
                    hasFilter={action.filter !== undefined}
                    onFilterPressed={this.enterFilterMode.bind(this, i, null)}
                    inputType="prompt"
                  />
                </Swipeout>
                {action.options
                  ? action.options.map((action, k) => (
                      <Swipeout
                        key={k}
                        backgroundColor={colors.black}
                        right={[
                          {
                            text: "Remove",
                            onPress: this.removeActionOption.bind(this, i, k),
                            backgroundColor: "#FE3A2F"
                          }
                        ]}
                      >
                        <StoryActionInput
                          value={action.title}
                          hasFilter={action.filter !== undefined}
                          onChange={this.updateActionOption.bind(this, i, k)}
                          suppressFilterIcon={true}
                          inputType="option"
                        />
                      </Swipeout>
                    ))
                  : null}
                <LightHeroButton
                  title="Add an option"
                  onPress={this.addOption.bind(this, i)}
                  style={{ minWidth: 100, alignSelf: "flex-end" }}
                />
              </View>
            ))}
          </View>
        </KeyboardAwareScrollView>
        <LightHeroButton
          title={this.state.story.actions.length > 0 ? "Add another action" : "Add your first action"}
          onPress={this.addAction.bind(this)}
          style={{ minWidth: 350, marginTop: 15 }}
        />
      </View>
    )
  }
}

const FilterLabelStyle: TextStyle = {
  color: colors.blue
}

const topBarStyle: ViewStyle = {
  minWidth: 200,
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between"
}

const topButtonStyle: ViewStyle = {
  flex: 1
}

const styles = StyleSheet.create({
  promptText: {
    fontSize: 24,
    color: colors.grey
  },
  nameInput: {
    height: 30,
    fontSize: 18,
    color: colors.white
  }
})
