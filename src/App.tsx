/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import * as React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';

import PartyView from './pages/PartyView'

import Story from './Story'

import outOfTheCave from './stories/outOfTheCave'
import appleDisaster from './stories/appleDisaster'


import Player from './Player';
import commonStyles from './styles/commonStyles';

import { Provider, connect } from 'react-redux'
import thunk from 'redux-thunk'
import { createStore, applyMiddleware } from 'redux'
import Index from './reducers/Index';

const store = createStore(Index, applyMiddleware(thunk))

type AppState = {
  story: Story
  players: Player[]
  playerName: string
  nameSet: boolean
  roomID: string
  inRoom: false
}

type AppProps = {}

export default class App extends React.Component<AppProps,AppState>  {

  constructor(props: any) {
    super(props)

    const player = new Player('')
    const players = [player]
    const story = new Story(outOfTheCave.defaultState, outOfTheCave.actions)

    this.state = {
      playerName: '',
      story,
      players: [player],
      roomID: '',
      nameSet: false,
      inRoom: false
    }

  }

  render() {

    let page = null

    if (!this.state.nameSet || !this.state.inRoom) {
      page = (
        <View style={commonStyles.container}>
          <Text style={commonStyles.headerText}>What is your name?</Text>
        </View>
      )
    }

    page = (
      <PartyView
        currentPlayerName={this.state.playerName}
        story={this.state.story}
        roomID={this.state.roomID}
      />
    )

    return (
      <Provider store={store}>
        {page}
      </Provider>
    )
  }
}

