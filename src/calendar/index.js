import _ from 'lodash';
import PropTypes from 'prop-types';
import XDate from 'xdate';
import memoize from 'memoize-one';
import React, {Component} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {getMoment} from '../momentResolver';
// @ts-expect-error
import GestureRecognizer, {swipeDirections} from 'react-native-swipe-gestures';
// @ts-expect-error
import {page, isGTE, isLTE, sameMonth} from '../dateutils';
// @ts-expect-error
import {xdateToData, parseDate, toMarkingFormat} from '../interface';
// @ts-expect-error
import {getState} from '../day-state-manager';
// import shouldComponentUpdate from './updater';
// @ts-expect-error
import {extractComponentProps} from '../component-updater';
// @ts-expect-error
import {WEEK_NUMBER} from '../testIDs';
import styleConstructor from './style';
import CalendarHeader from './header';
import Day from './day/index';
import BasicDay from './day/basic';
/**
 * @description: Calendar component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/calendars.js
 * @gif: https://github.com/wix/react-native-calendars/blob/master/demo/calendar.gif
 */
class Calendar extends Component {
  static displayName = 'Calendar';
  static propTypes = {
    ...CalendarHeader.propTypes,
    ...Day.propTypes,
    /** Specify theme properties to override specific styles for calendar parts. Default = {} */
    theme: PropTypes.object,
    /** Specify style for calendar container element. Default = {} */
    style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    /** Initially visible month. Default = Date() */
    current: PropTypes.any,
    /** Minimum date that can be selected, dates before minDate will be grayed out. Default = undefined */
    minDate: PropTypes.any,
    /** Maximum date that can be selected, dates after maxDate will be grayed out. Default = undefined */
    maxDate: PropTypes.any,
    /** If firstDay=1 week starts from Monday. Note that dayNames and dayNamesShort should still start from Sunday. */
    firstDay: PropTypes.number,
    /** Collection of dates that have to be marked. Default = {} */
    markedDates: PropTypes.object,
    /** Display loading indicator. Default = false */
    displayLoadingIndicator: PropTypes.bool,
    /** Show week numbers. Default = false */
    showWeekNumbers: PropTypes.bool,
    /** Do not show days of other months in month page. Default = false */
    hideExtraDays: PropTypes.bool,
    /** Always show six weeks on each month (only when hideExtraDays = false). Default = false */
    showSixWeeks: PropTypes.bool,
    /** Handler which gets executed on day press. Default = undefined */
    onDayPress: PropTypes.func,
    /** Handler which gets executed on day long press. Default = undefined */
    onDayLongPress: PropTypes.func,
    /** Handler which gets executed when month changes in calendar. Default = undefined */
    onMonthChange: PropTypes.func,
    /** Handler which gets executed when visible month changes in calendar. Default = undefined */
    onVisibleMonthsChange: PropTypes.func,
    /** Disables changing month when click on days of other months (when hideExtraDays is false). Default = false */
    disableMonthChange: PropTypes.bool,
    /** Enable the option to swipe between months. Default: false */
    enableSwipeMonths: PropTypes.bool,
    /** Disable days by default. Default = false */
    disabledByDefault: PropTypes.bool,
    /** Style passed to the header */
    headerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number, PropTypes.array]),
    /** Allow rendering of a totally custom header */
    customHeader: PropTypes.any,

    isExtended: PropTypes.bool,
    onExtended: PropTypes.func
  };
  static defaultProps = {
    enableSwipeMonths: false
  };
  state = {
    currentMonth: this.props.current ? parseDate(this.props.current) : new XDate()
  };
  style = styleConstructor(this.props.theme);
  header = React.createRef();
  addMonth = count => {
    this.updateMonth(this.state.currentMonth.clone().addMonths(count, true));
  };
  updateMonth = (day, doNotTriggerListeners = false) => {
    if (day.toString('yyyy MM') === this.state.currentMonth.toString('yyyy MM')) {
      return;
    }
    this.setState({currentMonth: day.clone()}, () => {
      if (!doNotTriggerListeners) {
        const currMont = this.state.currentMonth.clone();
        _.invoke(this.props, 'onMonthChange', xdateToData(currMont));
        _.invoke(this.props, 'onVisibleMonthsChange', [xdateToData(currMont)]);
      }
    });
  };
  handleDayInteraction(date, interaction) {
    const {disableMonthChange} = this.props;
    const day = parseDate(date);
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);
    if (!(minDate && !isGTE(day, minDate)) && !(maxDate && !isLTE(day, maxDate))) {
      const shouldUpdateMonth = disableMonthChange === undefined || !disableMonthChange;
      if (shouldUpdateMonth) {
        this.updateMonth(day);
      }
      if (interaction) {
        interaction(xdateToData(day));
      }
    }
  }
  pressDay = date => {
    this.handleDayInteraction(date, this.props.onDayPress);
  };
  longPressDay = date => {
    this.handleDayInteraction(date, this.props.onDayLongPress);
  };
  swipeProps = {onSwipe: direction => this.onSwipe(direction)};
  onSwipe = gestureName => {
    const {SWIPE_UP, SWIPE_DOWN, SWIPE_LEFT, SWIPE_RIGHT} = swipeDirections;
    switch (gestureName) {
      case SWIPE_UP:
      case SWIPE_DOWN:
        break;
      case SWIPE_LEFT:
        this.onSwipeLeft();
        break;
      case SWIPE_RIGHT:
        this.onSwipeRight();
        break;
    }
  };
  onSwipeLeft = () => {
    this.header?.current?.onPressRight();
  };
  onSwipeRight = () => {
    this.header?.current?.onPressLeft();
  };
  renderWeekNumber = memoize(weekNumber => {
    return (
      <View style={this.style.dayContainer} key={`week-container-${weekNumber}`}>
        <BasicDay
          key={`week-${weekNumber}`}
          marking={{disabled: true, disableTouchEvent: true}}
          // state='disabled'
          theme={this.props.theme}
          testID={`${WEEK_NUMBER}-${weekNumber}`}
        >
          {weekNumber}
        </BasicDay>
      </View>
    );
  });
  renderDay(day, id) {
    const {hideExtraDays, markedDates} = this.props;
    const dayProps = extractComponentProps(Day, this.props);
    if (!sameMonth(day, this.state.currentMonth) && hideExtraDays) {
      return <View key={id} style={this.style.emptyDayContainer} />;
    }
    return (
      <View style={this.style.dayContainer} key={id}>
        <Day
          {...dayProps}
          day={day}
          state={getState(day, this.state.currentMonth, this.props)}
          marking={markedDates?.[toMarkingFormat(day)]}
          onPress={this.pressDay}
          onLongPress={this.longPressDay}
        />
      </View>
    );
  }
  renderWeek(days, id) {
    const week = [];
    days.forEach((day, id2) => {
      week.push(this.renderDay(day, id2));
    }, this);
    if (this.props.showWeekNumbers) {
      week.unshift(this.renderWeekNumber(days[days.length - 1].getWeek()));
    }
    return (
      <View style={this.style.week} key={id}>
        {week}
      </View>
    );
  }
  renderMonth() {
    const {currentMonth} = this.state;
    const {firstDay, showSixWeeks, hideExtraDays} = this.props;
    const shouldShowSixWeeks = showSixWeeks && !hideExtraDays;
    const days = page(currentMonth, firstDay, shouldShowSixWeeks);
    const weeks = [];
    while (days.length) {
      weeks.push(this.renderWeek(days.splice(0, 7), weeks.length));
    }
    return <View style={this.style.monthView}>{weeks}</View>;
  }
  renderHeader() {
    const {customHeader, headerStyle, displayLoadingIndicator, markedDates, testID} = this.props;
    const current = parseDate(this.props.current);
    let indicator;
    if (current) {
      const lastMonthOfDay = toMarkingFormat(current.clone().addMonths(1, true).setDate(1).addDays(-1));
      if (displayLoadingIndicator && !markedDates?.[lastMonthOfDay]) {
        indicator = true;
      }
    }
    const headerProps = extractComponentProps(CalendarHeader, this.props);
    const CustomHeader = customHeader;
    const HeaderComponent = customHeader ? CustomHeader : CalendarHeader;
    return (
      <HeaderComponent
        {...headerProps}
        testID={testID}
        style={headerStyle}
        ref={this.header}
        month={this.state.currentMonth}
        addMonth={this.addMonth}
        displayLoadingIndicator={indicator}
      />
    );
  }

  renderMonthIndex = (calMonth, disMonth, endDate) => {
    var index = 0;
    if (calMonth === disMonth - 1 || calMonth === disMonth - 2) {
      index = -1;
    } else if (calMonth === endDate.month() && endDate.date() < 15) {
      index = -1;
    } else if (calMonth > disMonth && endDate > 15) {
      index = calMonth - disMonth;
    } else {
      index = disMonth - calMonth;
    }
    console.log('index is ==> ', index);
    return index;
  };

  renderExtendedButton = () => {
    const {isExtended, onExtended} = this.props;
    if (isExtended) return null;
    const moment = getMoment();
    // Start date of extended days
    const startDate = moment().add(26, 'days');
    const endDate = moment().add(3, 'months');
    let disMonth = startDate.month();
    // In which month extended button will display
    const calMonth = this.state.currentMonth.getMonth();
    // Top Position of button
    let top = 140;
    if (startDate.date() > 21) {
      disMonth = startDate.add(1, 'month').month();
    } else {
      if (disMonth + 2 === calMonth) {
        if (startDate.date() > 15) {
          top = 90;
        } else {
          top = 90;
        }
      } else if (disMonth + 1 === calMonth) {
        if (disMonth + 2 == moment().add(3, 'months').month()) {
          top = 140;
        } else {
          if (startDate.date() > 15) {
            top = 100;
          } else {
            top = 140;
          }
        }
      } else if (disMonth == calMonth) {
        if (startDate.date() > 10 && startDate.date() < 15) {
          top = 200;
        } else if (startDate.date() > 14 && startDate.date() < 25) {
          top = 250;
        } else {
          top = 150;
        }
      }
    }

    const currentMonth = new Date().getMonth();
    // if (calMonth === disMonth || calMonth === disMonth + 1) {
    if (this.renderMonthIndex(calMonth, disMonth, endDate) >= 0 && 
      (this.renderMonthIndex(calMonth, disMonth, endDate) !== currentMonth)) {
      return (
        <TouchableOpacity
          onPress={onExtended}
          style={{
            top,
            zIndex: 1000,
            position: 'absolute',
            alignSelf: 'center',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 30,
            backgroundColor: this.props.theme?.todayTextColor
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '500',
              color: '#fff',
              fontFamily: this.props.theme?.textDayFontFamily
            }}
          >
            Open Extended Calendar
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  };
  // Main item wrapper
  render() {
    const {enableSwipeMonths, style} = this.props;
    const GestureComponent = enableSwipeMonths ? GestureRecognizer : View;
    const gestureProps = enableSwipeMonths ? this.swipeProps : undefined;
    return (
      <GestureComponent {...gestureProps}>
        <View
          style={[this.style.container, style]}
          accessibilityElementsHidden={this.props.accessibilityElementsHidden} // iOS
          importantForAccessibility={this.props.importantForAccessibility} // Android
        >
          {this.renderHeader()}
          {this.renderMonth()}
          {this.renderExtendedButton()}
        </View>
      </GestureComponent>
    );
  }
}
export default Calendar;
