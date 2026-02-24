/**
 * 活动数据和用户信息演示页面
 */

import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useUser } from '@/hooks/useUser';
import {
  getAllEvents,
  getEventsCount,
  getActiveEvents,
  getOngoingEvents,
  getUpcomingEvents,
  getEndedEvents,
  getCarouselEvents,
  getEventStatusText,
  getEventStatusClass,
  getCategoryTranslation,
} from '@/utils/eventsData';
import type { Event } from '@/types';

export default function EventsDemo() {
  const { t, language } = useI18n();
  const { user, username, isLoading: userLoading } = useUser();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // 获取各种活动数据
  const allEvents = getAllEvents();
  const eventsCount = getEventsCount();
  const activeEvents = getActiveEvents();
  const ongoingEvents = getOngoingEvents();
  const upcomingEvents = getUpcomingEvents();
  const endedEvents = getEndedEvents();
  const carouselResult = getCarouselEvents();

  return (
    <div className="bg-linear-to-br from-purple-50 to-blue-50 px-4 py-8 min-h-screen">
      <div className="space-y-8 mx-auto max-w-7xl">
        {/* 标题 */}
        <div className="text-center">
          <h1 className="mb-2 font-bold text-gray-800 text-4xl">
            {t('EventsDemo', '活动数据演示')}
          </h1>
          <p className="text-gray-600">
            {t('Stage4Complete', '阶段4：工具函数层迁移完成')}
          </p>
        </div>

        {/* 用户信息卡片 */}
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="mb-4 font-bold text-gray-800 text-2xl">
            {t('UserInfo', '用户信息')}
          </h2>
          {userLoading ? (
            <p className="text-gray-600">{t('Loading', '加载中...')}</p>
          ) : user ? (
            <div className="space-y-2">
              <p className="text-lg">
                <span className="font-semibold">{t('Username', '用户名')}: </span>
                <span className="text-purple-600">{username}</span>
              </p>
              {user.email && (
                <p className="text-lg">
                  <span className="font-semibold">{t('Email', '邮箱')}: </span>
                  <span className="text-gray-700">{user.email}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">{t('NotLoggedIn', '未登录')}</p>
          )}
        </div>

        {/* 活动统计卡片 */}
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="mb-4 font-bold text-gray-800 text-2xl">
            {t('EventStatistics', '活动统计')}
          </h2>
          <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="font-bold text-blue-600 text-3xl">{eventsCount}</p>
              <p className="text-gray-600 text-sm">{t('TotalEvents', '总活动数')}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="font-bold text-green-600 text-3xl">{activeEvents.length}</p>
              <p className="text-gray-600 text-sm">{t('ActiveEvents', '活跃活动')}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <p className="font-bold text-yellow-600 text-3xl">{ongoingEvents.length}</p>
              <p className="text-gray-600 text-sm">{t('OngoingEvents', '进行中')}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="font-bold text-purple-600 text-3xl">{upcomingEvents.length}</p>
              <p className="text-gray-600 text-sm">{t('UpcomingEvents', '即将开始')}</p>
            </div>
          </div>
        </div>

        {/* 轮播活动展示 */}
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="mb-4 font-bold text-gray-800 text-2xl">
            {t('CarouselEvents', '轮播活动')}
            <span className="ml-2 font-normal text-gray-500 text-sm">
              ({carouselResult.shouldRotate ? t('RotationEnabled', '支持轮播') : t('RotationDisabled', '不轮播')})
            </span>
          </h2>
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            {carouselResult.events.map((event) => (
              <div
                key={event.id}
                className="hover:shadow-lg p-4 border border-gray-200 rounded-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-800 text-xl">{event.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    getEventStatusClass(event) === 'status-ongoing' ? 'bg-green-100 text-green-800' :
                    getEventStatusClass(event) === 'status-upcoming' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getEventStatusText(event)}
                  </span>
                </div>
                <p className="mb-2 text-gray-600 text-sm">
                  {getCategoryTranslation(event.category)}
                </p>
                <p className="text-gray-500 text-sm">{event.timeAgo}</p>
                <p className="mt-1 text-gray-400 text-xs">{event.createDateFormatted}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 活动列表（按状态分类） */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
          {/* 进行中的活动 */}
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h3 className="mb-4 font-bold text-green-600 text-xl">
              {t('OngoingEvents', '进行中')} ({ongoingEvents.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ongoingEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="bg-green-50 hover:bg-green-100 p-3 rounded-lg transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <p className="font-medium text-gray-800 text-sm">{event.title}</p>
                  <p className="text-gray-600 text-xs">{getCategoryTranslation(event.category)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 即将开始的活动 */}
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h3 className="mb-4 font-bold text-yellow-600 text-xl">
              {t('UpcomingEvents', '即将开始')} ({upcomingEvents.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {upcomingEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="bg-yellow-50 hover:bg-yellow-100 p-3 rounded-lg transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <p className="font-medium text-gray-800 text-sm">{event.title}</p>
                  <p className="text-gray-600 text-xs">{getCategoryTranslation(event.category)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 已结束的活动 */}
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h3 className="mb-4 font-bold text-gray-600 text-xl">
              {t('EndedEvents', '已结束')} ({endedEvents.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {endedEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <p className="font-medium text-gray-800 text-sm">{event.title}</p>
                  <p className="text-gray-600 text-xs">{getCategoryTranslation(event.category)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 活动详情模态框 */}
        {selectedEvent && (
          <div
            className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-white shadow-2xl p-6 rounded-lg w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-bold text-gray-800 text-2xl">{selectedEvent.title}</h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-700">{t('Category', '类别')}: </span>
                  <span className="text-gray-600">{getCategoryTranslation(selectedEvent.category)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">{t('Status', '状态')}: </span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    getEventStatusClass(selectedEvent) === 'status-ongoing' ? 'bg-green-100 text-green-800' :
                    getEventStatusClass(selectedEvent) === 'status-upcoming' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getEventStatusText(selectedEvent)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">{t('StartDate', '开始日期')}: </span>
                  <span className="text-gray-600">{selectedEvent.createDate}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">{t('EndDate', '结束日期')}: </span>
                  <span className="text-gray-600">{selectedEvent.endDate}</span>
                </div>
                {selectedEvent.description && (
                  <div>
                    <span className="font-semibold text-gray-700">{t('Description', '描述')}: </span>
                    <p className="mt-1 text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}
                <div className="pt-4">
                  <a
                    href={selectedEvent.href}
                    className="inline-block bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg text-white transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('ViewDetails', '查看详情')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 技术信息 */}
        <div className="bg-gray-800 shadow-md p-6 rounded-lg text-white">
          <h3 className="mb-4 font-bold text-xl">
            {t('TechnicalInfo', '技术信息')}
          </h3>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 font-mono text-sm">
            <div>
              <p className="text-gray-400">{t('CurrentLanguage', '当前语言')}: <span className="text-green-400">{language}</span></p>
              <p className="text-gray-400">{t('TotalEvents', '总活动数')}: <span className="text-green-400">{allEvents.length}</span></p>
              <p className="text-gray-400">{t('UserStatus', '用户状态')}: <span className="text-green-400">{user ? 'Logged In' : 'Guest'}</span></p>
            </div>
            <div>
              <p className="text-gray-400">Stage: <span className="text-green-400">4 - Utils Layer</span></p>
              <p className="text-gray-400">Features: <span className="text-green-400">Events + User + i18n</span></p>
              <p className="text-gray-400">Framework: <span className="text-green-400">React 19 + Vite + TS</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
