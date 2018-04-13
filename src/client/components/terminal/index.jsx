
/**
 * terminal/sftp wrapper
 */
import React from 'react'
import Term from './terminal'
import Sftp from '../sftp'
import {Icon} from 'antd'
import _ from 'lodash'
import {generate} from 'shortid'
import copy from 'json-deep-copy'
import classnames from 'classnames'
import {topMenuHeight, tabsHeight, sshTabHeight, terminalSplitDirectionMap} from '../../common/constants'

const termControlHeight = 33

const rebuildPosition = terminals => {
  let indexs = terminals.map(t => t.position).sort((a, b) => a - b)
  let indexMap = indexs.reduce((prev, pos, index) => {
    return {
      ...prev,
      [pos]: index * 10
    }
  }, {})
  return terminals.map(t => {
    return {
      ...t,
      position: indexMap[t.position]
    }
  })
}

const getPrevTerminal = terminals => {
  return _.last(terminals)
}


const {prefix} = window
const e = prefix('ssh')
const m = prefix('menu')

export default class WindowWrapper extends React.Component  {

  constructor(props) {
    super(props)
    let id = generate()
    this.state = {
      pane: 'ssh',
      splitDirection: terminalSplitDirectionMap.horizontal,
      activeSplitId: id,
      terminals: [
        {
          id,
          position: 0
        }
      ]
    }
  }

  computeHeight = () => {
    let hasHost = _.get(this.props, 'tab.host')
    let {showControl} = this.props
    return this.props.height -
      (showControl ? topMenuHeight : 0) -
      tabsHeight -
      (hasHost ? sshTabHeight : 0)
  }

  onChangePane = pane => {
    this.setState({
      pane
    })
  }

  doSplit = (e, id) => {
    let terminals = copy(this.state.terminals)
    let index = _.findIndex(terminals, t => t.id === id)
    if (index === -1) {
      index = terminals.length
    } else {
      index = index + 1
    }
    terminals.push({
      id: generate(),
      position: terminals[index - 1].position + 5
    })
    terminals = rebuildPosition(terminals)
    this.setState({
      terminals
    })
  }

  delSplit = () => {
    let {activeSplitId, terminals} = this.state
    let newTerms = terminals.filter(t => t.id !== activeSplitId)
    if (!newTerms.length) {
      return
    }
    newTerms = rebuildPosition(newTerms)
    let newActiveId = getPrevTerminal(newTerms).id
    this.setState({
      terminals: newTerms,
      activeSplitId: newActiveId
    })
  }

  changeDirection = () => {
    let {splitDirection} = this.state
    this.setState({
      splitDirection: splitDirection === terminalSplitDirectionMap.horizontal
        ? terminalSplitDirectionMap.vertical
        : terminalSplitDirectionMap.horizontal
    })
  }

  setActive = activeSplitId => {
    this.setState({
      activeSplitId
    })
  }

  computePosition = (index) => {
    let len = this.state.terminals.length || 1
    let {width: windowWidth} = this.props
    let {splitDirection} = this.state
    let isHori = splitDirection === terminalSplitDirectionMap.horizontal
    let heightAll = this.computeHeight()
    let width = isHori
      ? windowWidth / len
      : windowWidth
    let height = isHori
      ? heightAll
      : heightAll / len
    let left = isHori
      ? index * width
      : 0
    let top = isHori
      ? 0
      : index * height
    return {
      height,
      width,
      left,
      top
    }
  }

  renderTerminals = () => {
    let {pane, terminals} = this.state
    let cls = pane === 'ssh'
      ? 'terms-box'
      : 'terms-box hide'
    let {props} = this
    let height = this.computeHeight()
    let {width} = props
    return (
      <div
        className={cls}
        style={{
          width,
          height: height - termControlHeight
        }}
      >
        {
          terminals.map((t) => {
            let pops = {
              ...props,
              ...t,
              ..._.pick(
                this,
                ['setActive', 'doSplit']
              ),
              ...this.computePosition(t.position / 10)
            }
            return (
              <Term
                key={t.id}
                {...pops}
              />
            )
          })
        }
      </div>
    )
  }

  renderSftp = () => {
    let {pane} = this.state
    let height = this.computeHeight()
    let {props} = this
    let cls = pane === 'ssh'
      ? 'hide'
      : ''
    return (
      <div className={cls}>
        <Sftp
          {...props}
          height={height}
          pane={pane}
        />
      </div>
    )
  }

  renderControl = () => {
    let {pane, splitDirection, terminals} = this.state
    let {props} = this
    let host = _.get(props, 'tab.host')
    let tabs = host
      ? (
        <div className="term-sftp-tabs fleft">
          {
            ['ssh', 'sftp'].map((type, i) => {
              let cls = classnames(
                'type-tab',
                type,
                {
                  active: type === pane
                }
              )
              return (
                <span
                  className={cls}
                  key={type + '_' + i}
                  onClick={() => this.onChangePane(type)}
                >
                  {type}
                </span>
              )
            })
          }
        </div>
      )
      : null
    let cls1 = classnames(
      'mg1r icon-split pointer iblock',
      {
        'spin-90 mg-fix-2': splitDirection === terminalSplitDirectionMap.horizontal
      }
    )
    let cls2 = classnames(
      'icon-direction pointer iblock',
      {
        'spin-90 mg-fix-2': splitDirection === terminalSplitDirectionMap.vertical
      }
    )
    let hide = terminals.length < 2
    return (
      <div
        className="terminal-control fix"
      >
        {tabs}
        {
          pane === 'ssh'
            ? (
              <div className="fright term-controls">
                {
                  hide
                    ? null
                    : (
                      <Icon
                        type="delete"
                        className="mg1r icon-trash iblock pointer"
                        onClick={this.delSplit}
                        title={m('del')}
                      />
                    )
                }
                <Icon
                  type="minus-square-o"
                  className={cls1}
                  onClick={this.doSplit}
                  title={e('split')}
                />
                <Icon
                  type="minus-square-o"
                  className={cls2}
                  title={e('changeDirection')}
                  onClick={this.changeDirection}
                />
              </div>
            )
            : null
        }
      </div>
    )
  }

  render() {
    let {pane, splitDirection} = this.state
    let {props} = this
    let host = _.get(props, 'tab.host')
    return (
      <div
        className={'term-sftp-box ' + pane + ' ' + splitDirection}
      >
        {this.renderControl()}
        {this.renderTerminals()}
        {
          host
            ? this.renderSftp()
            : null
        }
      </div>
    )
  }

}
