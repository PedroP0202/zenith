require 'xcodeproj'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'App' }
app_group = project.main_group.find_subpath('App', true)

swift_file = 'WidgetSyncPlugin.swift'
m_file = 'WidgetSyncPlugin.m'

# Find or create file references in the App group
swift_ref = app_group.files.find { |f| f.path == swift_file } || app_group.new_file(swift_file)
m_ref = app_group.files.find { |f| f.path == m_file } || app_group.new_file(m_file)

# Add references to the target's source build phase if missing
unless target.source_build_phase.files_references.include?(swift_ref)
  target.source_build_phase.add_file_reference(swift_ref)
  puts "Added #{swift_file} to PBXSourcesBuildPhase"
end

unless target.source_build_phase.files_references.include?(m_ref)
  target.source_build_phase.add_file_reference(m_ref)
  puts "Added #{m_file} to PBXSourcesBuildPhase"
end

project.save
puts "Xcode project updated successfully."
